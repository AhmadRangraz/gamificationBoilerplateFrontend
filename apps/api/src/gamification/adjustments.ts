import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { lockAccount } from '../auth/account-transaction.js';
import type { PrismaService } from '../prisma.service.js';
import { pointBalance } from './balance.js';
import { localDay } from './calendar.js';

interface Adjustment {
  requestId: string;
  points: number;
  reason: string;
}

export async function adjustPoints(
  db: PrismaService,
  actorId: string,
  accountId: string,
  input: Adjustment,
) {
  if (actorId === accountId)
    throw new ForbiddenException('تغییر امتیاز حساب خودتان مجاز نیست.');
  const { requestId, points, reason } = input;
  const key = {
    event_sourceId: { event: 'ADMIN_ADJUSTMENT' as const, sourceId: requestId },
  };
  return db.$transaction(
    async (tx) => {
      const account = await lockAccount(tx, accountId);
      const assertReplay = (entry: {
        accountId: string;
        actorId: string | null;
        points: number;
        reason: string | null;
      }) => {
        if (
          entry.accountId !== accountId ||
          entry.actorId !== actorId ||
          entry.points !== points ||
          entry.reason !== reason
        ) {
          throw new ConflictException('شناسهٔ درخواست پیش‌تر استفاده شده است.');
        }
      };
      const existing = await tx.pointEntry.findUnique({ where: key });
      if (existing) {
        assertReplay(existing);
        return;
      }
      if (!account || account.suspendedAt || account.role !== 'MEMBER')
        throw new NotFoundException('حساب فعال پیدا نشد.');
      const balance = await pointBalance(tx, accountId);
      if (balance + points < 0)
        throw new ConflictException('امتیاز حساب برای این کسر کافی نیست.');

      const createdAt = new Date();
      const inserted = await tx.pointEntry.createMany({
        data: {
          accountId,
          actorId,
          reason,
          points,
          xp: 0,
          event: 'ADMIN_ADJUSTMENT',
          sourceId: requestId,
          outcome: 'AWARDED',
          earnedDay: localDay(createdAt),
          createdAt,
        },
        skipDuplicates: true,
      });
      if (!inserted.count)
        assertReplay(await tx.pointEntry.findUniqueOrThrow({ where: key }));
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
