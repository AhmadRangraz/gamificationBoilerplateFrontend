import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { awardBusinessEvent } from '../gamification/award.js';
import type { AccountActionKind } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { auditAccount, lockAccount } from './account-transaction.js';
import { AuthService } from './auth.service.js';
import { MockMail } from './mock-mail.js';
import { digest, hashPassword } from './session.js';

@Injectable()
export class AccountLifecycleService {
  private readonly logger = new Logger(AccountLifecycleService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly auth: AuthService,
    private readonly mail: MockMail,
  ) {}

  async requestVerification(accountId: string, peer: string) {
    this.mail.assertEnabled();
    await this.auth.limit(`verify-peer:${peer}`, 45);
    await this.auth.limit(`verify-account:${accountId}`, 4);
    await this.issue(accountId, 'VERIFY_EMAIL');
  }

  async requestReset(email: string, peer: string) {
    this.mail.assertEnabled();
    await this.auth.limit(`reset-peer:${peer}`, 45);
    await this.auth.limit(`reset-email:${email}`, 4);
    const account = await this.db.account.findUnique({
      where: { email },
      select: { id: true },
    });
    if (account) {
      try {
        await this.issue(account.id, 'RESET_PASSWORD');
      } catch {
        this.logger.error('Unable to queue a password reset message');
      }
    }
  }

  private async issue(accountId: string, kind: AccountActionKind) {
    const code = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + (kind === 'VERIFY_EMAIL' ? 30 : 15) * 60_000,
    );
    const to = await this.db.$transaction(async (tx) => {
      const account = await lockAccount(tx, accountId);
      if (
        !account ||
        account.suspendedAt ||
        (kind === 'VERIFY_EMAIL' && account.emailVerified)
      ) {
        return null;
      }
      const tokenHash = digest(code);
      await tx.accountAction.upsert({
        where: { accountId_kind: { accountId, kind } },
        create: { accountId, kind, tokenHash, expiresAt },
        update: { tokenHash, expiresAt },
      });
      return account.email;
    });
    if (to) await this.mail.send({ to, kind, code, expiresAt });
  }

  async complete(
    input:
      | { kind: 'VERIFY_EMAIL'; code: string }
      | { kind: 'RESET_PASSWORD'; code: string; password: string },
    peer: string,
  ) {
    const { kind, code } = input;
    this.mail.assertEnabled();
    await this.auth.limit(`action-peer:${peer}`, 90);
    const tokenHash = digest(code);
    const invalid = () =>
      new BadRequestException('کد منقضی شده یا معتبر نیست.');
    const action = await this.db.accountAction.findUnique({
      where: { tokenHash },
    });
    if (!action || action.kind !== kind || action.expiresAt <= new Date())
      throw invalid();

    const passwordHash =
      input.kind === 'RESET_PASSWORD'
        ? await hashPassword(input.password)
        : undefined;

    await this.db.$transaction(
      async (tx) => {
        const account = await lockAccount(tx, action.accountId);
        if (!account || account.suspendedAt) throw invalid();
        const removed = await tx.accountAction.deleteMany({
          where: { tokenHash, kind, expiresAt: { gt: new Date() } },
        });
        if (removed.count !== 1) throw invalid();

        if (passwordHash !== undefined) {
          await tx.account.update({
            where: { id: account.id },
            data: { passwordHash },
          });
          await tx.session.deleteMany({ where: { accountId: account.id } });
          await auditAccount(tx, 'PASSWORD_RESET', account.id, account.id);
        } else {
          await tx.account.update({
            where: { id: account.id },
            data: { emailVerified: true },
          });
          await auditAccount(tx, 'EMAIL_VERIFIED', account.id, account.id);
          await awardBusinessEvent(tx, {
            kind: 'EMAIL_VERIFIED',
            accountId: account.id,
          });
        }
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  async setSuspended(id: string, suspended: boolean, actorId: string) {
    await this.db.$transaction(async (tx) => {
      const account = await lockAccount(tx, id);
      if (!account || account.role !== 'MEMBER') {
        throw new NotFoundException('حساب کاربری قابل مدیریت پیدا نشد.');
      }
      if (Boolean(account.suspendedAt) === suspended) return;
      await tx.account.update({
        where: { id },
        data: { suspendedAt: suspended ? new Date() : null },
      });
      if (suspended) {
        await tx.session.deleteMany({ where: { accountId: id } });
        await tx.accountAction.deleteMany({ where: { accountId: id } });
      }
      await auditAccount(
        tx,
        suspended ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_RESTORED',
        id,
        actorId,
      );
    });
  }
}
