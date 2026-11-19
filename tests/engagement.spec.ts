import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { expect, test, type APIRequestContext } from '@playwright/test';
import forgeConfig from '../forge.config';
import { engagementCopy as copy } from '../apps/web/lib/engagement-copy';
import { dbClient, messagesFor } from './fixtures';

const headers = { origin: 'http://localhost:3000' };
const root = '/api/v1/gamification';
const engagement = `${root}/engagement`;
const listing = {
  title: 'آگهی آزمایشی',
  description: 'نمونهٔ قابل آزمون',
  category: 'BOOKS',
  price: 5,
};

async function register(session: APIRequestContext, email: string) {
  const response = await session.post('/api/v1/auth/register', {
    headers,
    data: { email, name: email.split('@')[0], password: randomUUID() },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

async function verify(session: APIRequestContext, email: string) {
  expect(
    (await session.post('/api/v1/auth/email/request', { headers })).status(),
  ).toBe(204);
  const code = (await messagesFor(email)).find(
    ({ kind }) => kind === 'VERIFY_EMAIL',
  )?.code;
  expect(code).toBeTruthy();
  expect(
    (
      await session.post('/api/v1/auth/email/verify', {
        headers,
        data: { code },
      })
    ).status(),
  ).toBe(204);
}

test(
  'streak protection, badge prerequisites and discounts share the private balance',
  { tag: '@gamification-enabled' },
  async ({ request }) => {
    const { streakProtectionCost, levelBenefits, badges, rewards } =
      forgeConfig.gamification;
    if (
      !streakProtectionCost ||
      levelBenefits.length !== 1 ||
      badges.length !== 2 ||
      !rewards.length
    )
      return test.skip(
        true,
        'Requires the progression verification configuration',
      );
    const db = await dbClient();
    const email = `forge-protect-${randomUUID()}@example.test`;
    const id = await register(request, email);
    const { localDay, shiftDay } =
      await import('../apps/api/dist/gamification/calendar.js');
    try {
      const today = localDay(new Date());
      await db.pointEntry.create({
        data: {
          accountId: id,
          event: 'LISTING_PUBLISHED',
          sourceId: randomUUID(),
          outcome: 'AWARDED',
          points: 120,
          xp: 100,
          earnedDay: shiftDay(today, -2),
          createdAt: new Date(Date.now() - 2 * 86400000),
        },
      });
      const protect = () =>
        request.post(`${engagement}/streak`, {
          headers,
          data: { mode: 'recover' },
        });
      const outcomes = await Promise.all([protect(), protect()]);
      expect(outcomes.map((response) => response.status())).toEqual([204, 204]);
      const progress = await (await request.get(`${root}/me`)).json();
      expect(progress).toMatchObject({
        points: 120 - streakProtectionCost,
        xp: 100,
        daily: { current: 2 },
        badges: [{ unlocked: true }, { unlocked: true }],
        rewardDiscount: levelBenefits[0]!.percent,
      });
      expect(
        await db.pointEntry.count({
          where: { accountId: id, event: 'STREAK_PROTECTED' },
        }),
      ).toBe(1);
      const cost = Math.ceil(
        (rewards[0]!.cost * (100 - levelBenefits[0]!.percent)) / 100,
      );
      expect(await (await request.get(`${root}/rewards`)).json()).toMatchObject(
        { rewards: [{ key: rewards[0]!.key, cost }] },
      );
      const redeem = await request.post(`${root}/rewards/redemptions`, {
        headers,
        data: { rewardKey: rewards[0]!.key, requestId: randomUUID() },
      });
      expect(redeem.status()).toBe(200);
      expect(await redeem.json()).toMatchObject({ cost });
    } finally {
      await db.accountAudit.deleteMany({ where: { accountId: id } });
      await db.account.delete({ where: { id } });
      await db.$disconnect();
    }
  },
);

test(
  'enrollment, goals, referrals, seasonal moderation and administration use trusted ledger events',
  { tag: '@gamification-enabled' },
  async ({ page, request }) => {
    const { challenge, referralReward, season, rewards } =
      forgeConfig.gamification;
    if (
      !challenge ||
      challenge.event !== 'LISTING_PUBLISHED' ||
      challenge.target !== 2 ||
      !referralReward ||
      !season ||
      !rewards.length
    )
      return test.skip(
        true,
        'Requires the Marketplace verification configuration',
      );
    const db = await dbClient();
    const firstEmail = `forge-first-${randomUUID()}@example.test`;
    const secondEmail = `forge-peer-${randomUUID()}@example.test`;
    const accounts: string[] = [];
    const rewardKey = `reward:${rewards[0]!.key}`;
    try {
      const first = await register(page.request, firstEmail);
      accounts.push(first);
      const peer = await register(request, secondEmail);
      accounts.push(peer);
      const publish = (session: APIRequestContext) =>
        session.post('/api/v1/marketplace/listings', {
          headers,
          data: listing,
        });
      const view = async (session: APIRequestContext) =>
        await (await session.get(engagement)).json();
      expect((await publish(page.request)).status()).toBe(201);
      expect((await view(page.request)).challenge).toMatchObject({
        joined: false,
        current: 0,
      });
      expect(
        (
          await page.request.post(`${engagement}/challenge/claim`, { headers })
        ).status(),
      ).toBe(409);
      await page.goto('/progress/engagement');
      await page.getByRole('button', { name: copy.join }).click();
      await expect(page.getByText(copy.enrolled)).toBeVisible();
      expect(
        (
          await page.request.post(`${engagement}/challenge/join`, { headers })
        ).status(),
      ).toBe(204);
      if (challenge.mode === 'group') {
        expect(
          (
            await request.post(`${engagement}/challenge/join`, { headers })
          ).status(),
        ).toBe(204);
      }
      expect(
        (
          await page.request.put(`${engagement}/goal`, {
            headers,
            data: { target: 2 },
          })
        ).status(),
      ).toBe(204);
      const results = await Promise.all([
        publish(page.request),
        publish(challenge.mode === 'group' ? request : page.request),
      ]);
      expect(results.map((response) => response.status())).toEqual([201, 201]);
      expect((await view(page.request)).challenge).toMatchObject({
        claimable: true,
        current: 2,
      });
      expect((await publish(page.request)).status()).toBe(201);
      expect((await view(page.request)).challenge.current).toBe(2);
      expect((await view(page.request)).goal.current).toBe(
        challenge.mode === 'group' ? 2 : 3,
      );
      const claim = () =>
        page.request.post(`${engagement}/challenge/claim`, { headers });
      expect(
        (await Promise.all([claim(), claim()])).map((response) =>
          response.status(),
        ),
      ).toEqual([204, 204]);
      expect(
        await db.pointEntry.count({
          where: { accountId: first, event: 'CHALLENGE_COMPLETED' },
        }),
      ).toBe(1);
      if (challenge.mode === 'group') {
        expect(
          (
            await request.post(`${engagement}/challenge/claim`, { headers })
          ).status(),
        ).toBe(204);
        expect(
          await db.pointEntry.count({
            where: { accountId: peer, event: 'CHALLENGE_COMPLETED' },
          }),
        ).toBe(1);
      }
      expect(
        (
          await request.post(`${engagement}/referral`, {
            headers,
            data: { code: first },
          })
        ).status(),
      ).toBe(404);
      await verify(page.request, firstEmail);
      expect(
        (
          await request.post(`${engagement}/referral`, {
            headers,
            data: { code: peer },
          })
        ).status(),
      ).toBe(409);
      expect(
        (
          await request.post(`${engagement}/referral`, {
            headers,
            data: { code: first },
          })
        ).status(),
      ).toBe(204);
      expect(
        (
          await page.request.post(`${engagement}/referral/${peer}/claim`, {
            headers,
          })
        ).status(),
      ).toBe(404);
      await verify(request, secondEmail);
      expect((await view(page.request)).referral.qualified).toEqual([
        { accountId: peer, claimed: false },
      ]);
      const referral = () =>
        page.request.post(`${engagement}/referral/${peer}/claim`, { headers });
      expect(
        (await Promise.all([referral(), referral()])).map((response) =>
          response.status(),
        ),
      ).toEqual([204, 204]);
      expect(
        await db.pointEntry.count({
          where: { accountId: first, event: 'REFERRAL_COMPLETED' },
        }),
      ).toBe(1);

      expect((await page.request.get(`${root}/admin`)).status()).toBe(403);
      await db.account.update({ where: { id: peer }, data: { role: 'ADMIN' } });
      expect(
        (
          await page.request.patch(`${root}/preferences`, {
            headers,
            data: { leaderboardOptIn: true },
          })
        ).status(),
      ).toBe(204);
      const ranks = async () =>
        await (
          await page.request.get(`${root}/leaderboard?period=season`)
        ).json();
      expect((await ranks()).myRank).toBe(1);
      expect(
        (
          await request.put(`${root}/admin/ranking/${first}`, {
            headers,
            data: { excluded: true },
          })
        ).status(),
      ).toBe(204);
      expect((await ranks()).myRank).toBeNull();
      expect(
        (
          await request.put(`${root}/admin/controls`, {
            headers,
            data: { key: rewardKey, value: 0 },
          })
        ).status(),
      ).toBe(204);
      const available = await (
        await page.request.get(`${root}/rewards`)
      ).json();
      expect(available.rewards).toHaveLength(rewards.length - 1);
      const audit = await (await request.get(`${root}/admin`)).json();
      expect(audit.audit).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: rewardKey, actorId: peer, value: 0 }),
          expect.objectContaining({
            key: `ranking:${first}`,
            actorId: peer,
            value: 1,
          }),
        ]),
      );
    } finally {
      await db.gamificationControl.deleteMany({ where: { key: rewardKey } });
      await db.gamificationAudit.deleteMany({
        where: { actorId: { in: accounts } },
      });
      await db.accountAudit.deleteMany({
        where: { accountId: { in: accounts } },
      });
      await db.account.deleteMany({ where: { id: { in: accounts } } });
      await db.challengeGroup.deleteMany({ where: { key: challenge.key } });
      await db.$disconnect();
      for (const email of [firstEmail, secondEmail])
        for (const { path } of await messagesFor(email))
          await rm(path, { force: true });
    }
  },
);
