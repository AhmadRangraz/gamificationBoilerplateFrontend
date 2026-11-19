import { forgeConfig } from '@forge/config';
import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { BusinessEvent } from './award.js';
import { localDay } from './calendar.js';
import { questWindowStatus } from './quest.js';

export function challengeEntryKey(accountId: string, challengeKey: string) {
  return { accountId_challengeKey: { accountId, challengeKey } };
}

export async function groupCount(
  tx: Prisma.TransactionClient,
  challengeKey: string,
) {
  return (
    (await tx.challengeGroup.findUnique({ where: { key: challengeKey } }))
      ?.count ?? 0
  );
}

export async function recordEngagement(
  tx: Prisma.TransactionClient,
  event: BusinessEvent,
  when: Date,
) {
  const { challenge, referralReward } = forgeConfig.gamification;
  if (referralReward && event.kind === 'EMAIL_VERIFIED')
    await tx.referral.updateMany({
      where: { accountId: event.accountId, qualifiedAt: null },
      data: { qualifiedAt: when },
    });
  if (
    !challenge ||
    challenge.event !== event.kind ||
    questWindowStatus(challenge, when.getTime()) !== 'ACTIVE'
  )
    return;
  const where = challengeEntryKey(event.accountId, challenge.key);
  const entry = await tx.challengeEntry.findUnique({ where });
  if (!entry || entry.joinedAt > when) return;
  if (challenge.mode === 'group') {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`forge:challenge:${challenge.key}`}, 0))`;
    if ((await groupCount(tx, challenge.key)) >= challenge.target) return;
    await tx.challengeGroup.upsert({
      where: { key: challenge.key },
      create: { key: challenge.key, count: 1 },
      update: { count: { increment: 1 } },
    });
  } else if (entry.count >= challenge.target) return;
  await tx.challengeEntry.update({ where, data: { count: { increment: 1 } } });
}

export function grantEngagementReward(
  tx: Prisma.TransactionClient,
  accountId: string,
  event: 'CHALLENGE_COMPLETED' | 'REFERRAL_COMPLETED',
  sourceId: string,
  reward: { points: number; xp: number },
  now: Date,
) {
  return tx.pointEntry.create({
    data: {
      accountId,
      event,
      sourceId,
      outcome: 'AWARDED',
      ...reward,
      createdAt: now,
      earnedDay: localDay(now),
    },
  });
}

export function requireActiveWindow(
  challenge: { startsAt: string; endsAt: string },
  now: Date,
) {
  if (questWindowStatus(challenge, now.getTime()) !== 'ACTIVE')
    throw new ConflictException('مهلت ثبت‌نام چالش فعال نیست.');
}
