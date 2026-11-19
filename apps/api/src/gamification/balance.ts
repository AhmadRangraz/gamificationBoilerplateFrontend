import { forgeConfig } from '@forge/config';
import type { Prisma } from '../generated/prisma/client.js';

export async function pointBalance(
  tx: Prisma.TransactionClient,
  accountId: string,
) {
  const { _sum } = await tx.pointEntry.aggregate({
    where: { accountId },
    _sum: { points: true },
  });
  return _sum.points ?? 0;
}

export function levelIndex(xp: number) {
  return forgeConfig.gamification.levelThresholds.reduce(
    (level, threshold, index) => (threshold <= xp ? index : level),
    0,
  );
}

export function rewardDiscount(level: number) {
  return forgeConfig.gamification.levelBenefits.reduce(
    (best, benefit) =>
      benefit.level <= level ? Math.max(best, benefit.percent) : best,
    0,
  );
}

export async function accountDiscount(
  tx: Prisma.TransactionClient,
  accountId: string,
) {
  if (!forgeConfig.gamification.levelBenefits.length) return 0;
  const { _sum } = await tx.pointEntry.aggregate({
    where: { accountId },
    _sum: { xp: true },
  });
  return rewardDiscount(levelIndex(_sum.xp ?? 0) + 1);
}

export function discountedCost(cost: number, discount: number) {
  return Math.ceil((cost * (100 - discount)) / 100);
}
