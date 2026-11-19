import { earningRuleKeys, forgeConfig } from '@forge/config';
import { lockAccount } from '../auth/account-transaction.js';
import { localDay } from './calendar.js';
import type { Prisma } from '../generated/prisma/client.js';
import { recordMissionProgress } from './mission.js';
import { recordQuestProgress } from './quest.js';
import { recordEngagement } from './engagement.js';

export type BusinessEvent =
  | { kind: 'EMAIL_VERIFIED'; accountId: string }
  | { kind: 'LISTING_PUBLISHED'; accountId: string; listingId: string }
  | { kind: 'POST_PUBLISHED'; accountId: string; postId: string }
  | { kind: 'LESSON_COMPLETED'; accountId: string; completionId: string };

function eventId(event: BusinessEvent) {
  switch (event.kind) {
    case 'EMAIL_VERIFIED':
      return event.accountId;
    case 'LISTING_PUBLISHED':
      return event.listingId;
    case 'POST_PUBLISHED':
      return event.postId;
    case 'LESSON_COMPLETED':
      return event.completionId;
  }
}

export async function awardBusinessEvent(
  tx: Prisma.TransactionClient,
  event: BusinessEvent,
) {
  if (!forgeConfig.features.gamification) return;

  const { kind, accountId } = event;
  const rules = forgeConfig.gamification.rules;
  const rule = rules[earningRuleKeys[kind]];
  if (!rule) return;

  // Every award writer takes the same account lock before reading the daily cap.
  const account = await lockAccount(tx, accountId);
  if (!account || account.suspendedAt)
    throw new Error('Ineligible reward account');

  const sourceId = eventId(event);
  const seen = await tx.pointEntry.findUnique({
    where: { event_sourceId: { event: kind, sourceId } },
    select: { accountId: true },
  });
  if (seen) {
    if (seen.accountId !== accountId)
      throw new Error('Reward source belongs to a different account');
    return;
  }

  if (kind === 'EMAIL_VERIFIED') {
    if (!account.emailVerified)
      throw new Error('Email verification has not been recorded');
  } else if (kind === 'LISTING_PUBLISHED') {
    const listing = await tx.listing.findUnique({
      where: { id: sourceId, ownerId: accountId },
      select: { id: true },
    });
    if (!listing)
      throw new Error(
        'Listing publication has not been recorded for this account',
      );
  } else {
    const source =
      kind === 'POST_PUBLISHED'
        ? await tx.communityPost.findUnique({
            where: { id: sourceId, authorId: accountId },
            select: { id: true },
          })
        : await tx.lessonCompletion.findUnique({
            where: { id: sourceId, accountId },
            select: { id: true },
          });
    if (!source)
      throw new Error('Reward source has not been recorded for this account');
  }

  const createdAt = new Date();
  const earnedDay = localDay(createdAt);
  const earned = await tx.pointEntry.count({
    where: { accountId, event: kind, earnedDay, outcome: 'AWARDED' },
  });
  const control = await tx.gamificationControl.findUnique({
    where: { key: `cap:${kind}` },
  });
  const capped = earned >= (control?.value ?? rule.dailyLimit);
  await tx.pointEntry.create({
    data: {
      accountId,
      event: kind,
      sourceId,
      earnedDay,
      createdAt,
      outcome: capped ? 'CAPPED' : 'AWARDED',
      points: capped ? 0 : rule.points,
      xp: capped ? 0 : rule.xp,
    },
  });
  if (!capped) {
    await recordMissionProgress(tx, event, createdAt, earnedDay);
    await recordQuestProgress(tx, event, createdAt, earnedDay);
    await recordEngagement(tx, event, createdAt);
  }
}
