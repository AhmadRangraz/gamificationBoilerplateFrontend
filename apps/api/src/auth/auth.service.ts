import {
  ConflictException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { auditAccount, lockAccount } from './account-transaction.js';
import type { CredentialsDto, RegisterDto } from './auth.dto.js';
import {
  digest,
  hashPassword,
  issueSession,
  verifyPassword,
} from './session.js';

const publicAccount = {
  id: true,
  email: true,
  name: true,
  role: true,
  emailVerified: true,
  suspendedAt: true,
} satisfies Prisma.AccountSelect;

@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService) {}

  async limit(key: string, maximum: number) {
    const [attempt] = await this.db.$queryRaw<{ count: number }[]>`
      INSERT INTO "AuthAttempt" ("key", "count", "expiresAt")
      VALUES (${digest(key)}, 1, now() + interval '15 minutes')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "AuthAttempt"."expiresAt" <= now() THEN 1
                       ELSE LEAST("AuthAttempt"."count" + 1, ${maximum + 1}::int) END,
        "expiresAt" = CASE WHEN "AuthAttempt"."expiresAt" <= now()
                           THEN EXCLUDED."expiresAt" ELSE "AuthAttempt"."expiresAt" END
      RETURNING "count"
    `;
    if (!attempt || attempt.count > maximum) {
      throw new HttpException(
        'تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
        429,
      );
    }
  }

  async register(input: RegisterDto, peer: string, previousToken?: string) {
    await this.limit(`register-peer:${peer}`, 60);
    const session = issueSession();
    const passwordHash = await hashPassword(input.password);

    try {
      const account = await this.db.$transaction(async (tx) => {
        if (previousToken)
          await tx.session.deleteMany({
            where: { tokenHash: digest(previousToken) },
          });
        const registered = await tx.account.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash,
            sessions: {
              create: {
                tokenHash: digest(session.token),
                expiresAt: session.expiresAt,
              },
            },
          },
          select: publicAccount,
        });
        await auditAccount(tx, 'REGISTER', registered.id, registered.id);
        return registered;
      });
      return { account, token: session.token };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('ثبت حساب با این اطلاعات ممکن نیست.');
      }
      throw error;
    }
  }

  async login(input: CredentialsDto, peer: string, previousToken?: string) {
    await this.limit(`login-peer:${peer}`, 180);
    await this.limit(`login-email:${input.email}`, 10);
    const account = await this.db.account.findUnique({
      where: { email: input.email },
    });
    const verified = await verifyPassword(
      input.password,
      account?.passwordHash,
    );
    if (!account || account.suspendedAt || !verified) {
      throw new UnauthorizedException('ایمیل یا گذرواژه صحیح نیست.');
    }
    const session = issueSession();
    const profile = await this.db.$transaction(async (tx) => {
      const locked = await lockAccount(tx, account.id);
      if (
        !locked ||
        locked.suspendedAt ||
        locked.passwordHash !== account.passwordHash
      ) {
        throw new UnauthorizedException('ایمیل یا گذرواژه صحیح نیست.');
      }
      if (previousToken)
        await tx.session.deleteMany({
          where: { tokenHash: digest(previousToken) },
        });
      await tx.session.create({
        data: {
          tokenHash: digest(session.token),
          accountId: account.id,
          expiresAt: session.expiresAt,
        },
      });
      await auditAccount(tx, 'LOGIN', locked.id, locked.id);
      return tx.account.findUniqueOrThrow({
        where: { id: locked.id },
        select: publicAccount,
      });
    });
    return { account: profile, token: session.token };
  }

  async resolve(token?: string) {
    if (!token) return null;
    const session = await this.db.session.findUnique({
      where: { tokenHash: digest(token), expiresAt: { gt: new Date() } },
      select: { account: { select: publicAccount } },
    });
    if (!session || session.account.suspendedAt) return null;
    return session.account;
  }

  async logout(token?: string) {
    if (!token) return;
    await this.db.$transaction(async (tx) => {
      const tokenHash = digest(token);
      const session = await tx.session.findUnique({
        where: { tokenHash },
        select: { accountId: true },
      });
      if (!session) return;
      const deleted = await tx.session.deleteMany({ where: { tokenHash } });
      if (deleted.count)
        await auditAccount(tx, 'LOGOUT', session.accountId, session.accountId);
    });
  }

  updateProfile(id: string, name: string) {
    return this.db.account.update({
      where: { id },
      data: { name },
      select: publicAccount,
    });
  }

  listAccounts() {
    return this.db.account.findMany({
      take: 50,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: publicAccount,
    });
  }
}
