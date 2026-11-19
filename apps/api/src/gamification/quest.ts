import { forgeConfig } from '@forge/config';
import type { Prisma } from '../generated/prisma/client.js';
import type { BusinessEvent } from './award.js';
import { periodStart } from './calendar.js';

export function questWindowStatus(
  quest: { startsAt: string; endsAt: string },
  now: number,
) {
  if (now < Date.parse(quest.startsAt)) return 'UPCOMING';
  if (now >= Date.parse(quest.endsAt)) return 'EXPIRED';
  return 'ACTIVE';
}

export function questOccurrence(
  cadence: 'once' | 'daily' | 'weekly',
  day: string,
) {
  return cadence === 'once' ? 'once' : periodStart(cadence, day)!;
}

export async function recordQuestProgress(
  tx: Prisma.TransactionClient,
  { kind, accountId }: BusinessEvent,
  createdAt: Date,
  earnedDay: string,
) {
  const quest = forgeConfig.gamification.quest;
  if (quest?.event !== kind) return;
  if (
    quest.cadence === 'once' &&
    questWindowStatus(quest, createdAt.getTime()) !== 'ACTIVE'
  )
    return;

  // The business award has already locked the account and consumed the source.
  const key = {
    accountId,
    questKey: quest.key,
    occurrence: questOccurrence(quest.cadence, earnedDay),
  };
  const where = { accountId_questKey_occurrence: key };
  const previous = await tx.questProgress.findUnique({ where });
  if (previous?.completedAt) return;

  const count = (previous?.count ?? 0) + 1;
  const completedAt = count >= quest.target ? createdAt : null;
  const { id } = await tx.questProgress.upsert({
    where,
    create: { ...key, count, completedAt },
    update: { count, completedAt },
    select: { id: true },
  });
  if (!completedAt) return;

  await tx.pointEntry.create({
    data: {
      accountId,
      event: 'QUEST_COMPLETED',
      sourceId: id,
      outcome: 'AWARDED',
      ...quest.reward,
      earnedDay,
      createdAt,
    },
  });
}
