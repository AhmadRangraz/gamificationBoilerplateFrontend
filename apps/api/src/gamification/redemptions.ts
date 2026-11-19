import { forgeConfig } from '@forge/config';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { lockAccount } from '../auth/account-transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import { accountDiscount, discountedCost, pointBalance } from './balance.js';
import { localDay } from './calendar.js';

export const redemptionFields = {
  id: true,
  rewardKey: true,
  title: true,
  cost: true,
  createdAt: true,
} satisfies Prisma.RewardRedemptionSelect;

export async function redeemReward(
  tx: Prisma.TransactionClient,
  accountId: string,
  { requestId, rewardKey }: { requestId: string; rewardKey: string },
) {
  const account = await lockAccount(tx, accountId);
  if (!account || account.suspendedAt)
    throw new UnauthorizedException('حساب کاربری فعال نیست.');

  const previous = await tx.rewardRedemption.findUnique({
    where: { accountId_requestId: { accountId, requestId } },
    select: redemptionFields,
  });
  if (previous) {
    if (previous.rewardKey !== rewardKey)
      throw new ConflictException(
        'شناسهٔ درخواست پیش‌تر برای پاداش دیگری استفاده شده است.',
      );
    return previous;
  }

  const reward = forgeConfig.gamification.rewards.find(
    ({ key }) => key === rewardKey,
  );
  const setting =
    reward &&
    (await tx.gamificationControl.findUnique({
      where: { key: `reward:${reward.key}` },
    }));
  const price = setting?.value ?? reward?.cost ?? 0;
  if (!reward || !price) throw new NotFoundException('پاداش پیدا نشد.');
  const cost = discountedCost(price, await accountDiscount(tx, accountId));
  if ((await pointBalance(tx, accountId)) < cost)
    throw new ConflictException('امتیاز حساب برای دریافت این پاداش کافی نیست.');

  const createdAt = new Date();
  const receipt = await tx.rewardRedemption.create({
    data: {
      accountId,
      requestId,
      rewardKey,
      title: reward.title,
      cost,
      createdAt,
    },
    select: redemptionFields,
  });
  await tx.pointEntry.create({
    data: {
      accountId,
      event: 'REWARD_REDEEMED',
      sourceId: receipt.id,
      outcome: 'AWARDED',
      points: -receipt.cost,
      xp: 0,
      earnedDay: localDay(createdAt),
      createdAt,
    },
  });
  return receipt;
}
