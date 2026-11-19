import { forgeConfig } from '@forge/config';
import type { Prisma } from '../generated/prisma/client.js';
import type { BusinessEvent } from './award.js';

export async function recordMissionProgress(
  tx: Prisma.TransactionClient,
  { kind, accountId }: BusinessEvent,
  createdAt: Date,
  earnedDay: string,
) {
  const mission = forgeConfig.gamification.mission;
  if (!mission) return;
  if (mission.requiresQuest) {
    const prerequisite = await tx.questProgress.findUnique({
      where: {
        accountId_questKey_occurrence: {
          accountId,
          questKey: mission.requiresQuest,
          occurrence: 'once',
        },
      },
      select: { completedAt: true },
    });
    if (!prerequisite?.completedAt) return;
  }

  // The award has consumed this source and still holds the account lock.
  const key = { accountId, missionKey: mission.key };
  const where = { accountId_missionKey: key };
  const previous = await tx.missionProgress.findUnique({ where });
  const position = previous?.completedSteps ?? 0;
  const step = mission.steps[position];
  if (previous?.completedAt || step?.event !== kind) return;

  const count = (previous?.stepCount ?? 0) + 1;
  const stepCompleted = count >= step.target;
  const completedSteps = stepCompleted ? position + 1 : position;
  const completedAt =
    completedSteps === mission.steps.length ? createdAt : null;
  const progress = {
    completedSteps,
    stepCount: stepCompleted ? 0 : count,
    completedAt,
  };
  const { id } = await tx.missionProgress.upsert({
    where,
    create: { ...key, ...progress },
    update: progress,
    select: { id: true },
  });
  if (!completedAt) return;

  await tx.pointEntry.create({
    data: {
      accountId,
      event: 'MISSION_COMPLETED',
      sourceId: id,
      outcome: 'AWARDED',
      ...mission.reward,
      earnedDay,
      createdAt,
    },
  });
}
