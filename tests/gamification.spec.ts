import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { mock } from 'node:test';
import { expect, test, type APIRequestContext } from '@playwright/test';
import forgeConfig from '../forge.config';
import { ui } from '../apps/web/lib/account-copy';
import { progressCopy } from '../apps/web/lib/progress-copy';
import { dbClient, messagesFor } from './fixtures';

const progressPath = '/api/v1/gamification/me';
const rewardsPath = '/api/v1/gamification/rewards';
const redemptionsPath = `${rewardsPath}/redemptions`;
const listingPath = '/api/v1/marketplace/listings';
const headers = { origin: 'http://localhost:3000' };
const readCommitted = { isolationLevel: 'ReadCommitted' } as const;
const listing = {
  title: 'چراغ مطالعه',
  description: 'چراغ با سه درجه روشنایی',
  category: 'ELECTRONICS' as const,
  price: 230_000,
};

async function completionTotals(
  db: Awaited<ReturnType<typeof dbClient>>,
  accountId: string,
) {
  const { _sum } = await db.pointEntry.aggregate({
    where: {
      accountId,
      event: { in: ['QUEST_COMPLETED', 'MISSION_COMPLETED'] },
    },
    _sum: { points: true, xp: true },
  });
  return { points: _sum.points ?? 0, xp: _sum.xp ?? 0 };
}

async function register(request: APIRequestContext, email: string) {
  const response = await request.post('/api/v1/auth/register', {
    headers,
    data: { email, name: 'کاربر آزمایشی', password: randomUUID() },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

async function cleanup(
  db: Awaited<ReturnType<typeof dbClient>>,
  emails: string[],
) {
  const accounts = await db.account.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  await db.accountAudit.deleteMany({
    where: { accountId: { in: accounts.map(({ id }) => id) } },
  });
  await db.account.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
}

test(
  'gamification is absent from the API and web when disabled',
  { tag: '@gamification-disabled' },
  async ({ page, request }) => {
    expect((await request.get(progressPath)).status()).toBe(404);
    expect((await request.get(rewardsPath)).status()).toBe(404);
    expect((await page.goto('/progress'))?.status()).toBe(404);
    expect((await page.goto('/progress/rewards'))?.status()).toBe(404);
  },
);

test(
  'reward redemption is private and debits points once across retries and races',
  { tag: '@gamification-enabled' },
  async ({ page, request }) => {
    const rewards = forgeConfig.gamification.rewards;
    const reward = rewards[0];
    const email = `forge-redeem-${randomUUID()}@example.test`;
    const otherEmail = `forge-redeem-${randomUUID()}@example.test`;
    const db = await dbClient();
    try {
      expect((await request.get(rewardsPath)).status()).toBe(401);
      const accountId = await register(page.request, email);
      const catalog = await page.request.get(rewardsPath);
      expect(catalog.headers()['cache-control']).toBe('no-store');
      expect(await catalog.json()).toEqual({
        balance: 0,
        rewards,
        redemptions: [],
      });
      if (!reward) {
        await page.goto('/progress/rewards');
        await expect(page.getByText(progressCopy.noRewards)).toBeVisible();
        await expect(page.getByText(progressCopy.noRedemptions)).toBeVisible();
        return;
      }

      const requestId = randomUUID();
      const body = { requestId, rewardKey: reward.key };
      const redeem = (id: string) =>
        page.request.post(redemptionsPath, {
          headers,
          data: { ...body, requestId: id },
        });
      expect(
        (await request.post(redemptionsPath, { headers, data: body })).status(),
      ).toBe(401);
      expect(
        (await page.request.post(redemptionsPath, { data: body })).status(),
      ).toBe(403);
      expect(
        (
          await page.request.post(redemptionsPath, {
            headers,
            data: { ...body, cost: 0, accountId },
          })
        ).status(),
      ).toBe(400);
      const unknownKey = `unlisted-${randomUUID()}`;
      expect(
        (
          await page.request.post(redemptionsPath, {
            headers,
            data: { ...body, rewardKey: unknownKey },
          })
        ).status(),
      ).toBe(404);
      expect((await redeem(requestId)).status()).toBe(409);

      const { localDay } =
        await import('../apps/api/dist/gamification/calendar.js');
      const credit = (id: string, points: number, xp = 0) =>
        db.pointEntry.create({
          data: {
            accountId: id,
            event: 'LISTING_PUBLISHED',
            sourceId: randomUUID(),
            outcome: 'AWARDED',
            points,
            xp,
            earnedDay: localDay(new Date()),
          },
        });
      await credit(accountId, reward.cost * 2, 7);
      const { redeemReward } =
        await import('../apps/api/dist/gamification/redemptions.js');
      await expect(
        db.$transaction(async (tx) => {
          const receipt = await redeemReward(tx, accountId, body);
          expect(
            await tx.pointEntry.findUnique({
              where: {
                event_sourceId: {
                  event: 'REWARD_REDEEMED',
                  sourceId: receipt.id,
                },
              },
            }),
          ).toMatchObject({ accountId, points: -reward.cost, xp: 0 });
          throw new Error('redemption rollback fixture');
        }, readCommitted),
      ).rejects.toThrow('redemption rollback fixture');
      expect(await (await page.request.get(rewardsPath)).json()).toMatchObject({
        balance: reward.cost * 2,
        redemptions: [],
      });
      expect(
        await db.pointEntry.count({
          where: { accountId, event: 'REWARD_REDEEMED' },
        }),
      ).toBe(0);

      const duplicates = await Promise.all([
        redeem(requestId),
        redeem(requestId),
      ]);
      expect(duplicates.map((response) => response.status())).toEqual([
        200, 200,
      ]);
      const receipt = await duplicates[0]!.json();
      expect(await duplicates[1]!.json()).toEqual(receipt);
      expect(receipt).toMatchObject({
        rewardKey: reward.key,
        title: reward.title,
        cost: reward.cost,
      });
      expect(
        (
          await page.request.post(redemptionsPath, {
            headers,
            data: { ...body, rewardKey: rewards[1]?.key ?? unknownKey },
          })
        ).status(),
      ).toBe(409);

      const racing = await Promise.all([
        redeem(randomUUID()),
        redeem(randomUUID()),
      ]);
      expect(racing.map((response) => response.status()).sort()).toEqual([
        200, 409,
      ]);
      const snapshot = await (await page.request.get(rewardsPath)).json();
      expect(snapshot.balance).toBe(0);
      expect(snapshot.redemptions).toHaveLength(2);
      expect(await (await page.request.get(progressPath)).json()).toMatchObject(
        { points: 0, xp: 7 },
      );

      const otherId = await register(request, otherEmail);
      expect(await (await request.get(rewardsPath)).json()).toMatchObject({
        balance: 0,
        redemptions: [],
      });
      await credit(otherId, reward.cost);
      const other = await request.post(redemptionsPath, {
        headers,
        data: body,
      });
      expect(other.status()).toBe(200);
      const otherReceipt = await other.json();
      expect(otherReceipt.id).not.toBe(receipt.id);
      expect(await (await request.get(rewardsPath)).json()).toMatchObject({
        redemptions: [otherReceipt],
      });

      await credit(accountId, reward.cost);
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto('/progress');
      await page.getByRole('link', { name: progressCopy.rewards }).click();
      const button = page.getByRole('button', {
        name: `${progressCopy.redeem} ${reward.title}`,
        exact: true,
      });
      await expect(button).toBeEnabled();
      let lostRequestId: string | undefined;
      await page.route(
        `**${redemptionsPath}`,
        async (route) => {
          lostRequestId = route.request().postDataJSON().requestId as string;
          const response = await route.fetch();
          expect(response.status()).toBe(200);
          await route.abort();
        },
        { times: 1 },
      );
      await button.click();
      await expect(page.getByText(ui.retry, { exact: true })).toBeVisible();
      expect(lostRequestId).toBeTruthy();

      const retried = page.waitForResponse((response) =>
        response.url().endsWith(redemptionsPath),
      );
      await button.click();
      const response = await retried;
      expect(response.status()).toBe(200);
      expect(response.request().postDataJSON().requestId).toBe(lostRequestId);
      await expect(page.getByText(progressCopy.rewardSaved)).toBeVisible();
      await expect(button).toBeDisabled();
      const final = await (await page.request.get(rewardsPath)).json();
      expect(final.balance).toBe(0);
      expect(final.redemptions).toHaveLength(3);
      const debits = await db.pointEntry.findMany({
        where: { accountId, event: 'REWARD_REDEEMED' },
        select: { sourceId: true, points: true, xp: true },
      });
      expect(debits).toHaveLength(3);
      expect(debits).toEqual(
        expect.arrayContaining(
          final.redemptions.map(({ id }: { id: string }) => ({
            sourceId: id,
            points: -reward.cost,
            xp: 0,
          })),
        ),
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(360);
    } finally {
      await cleanup(db, [email, otherEmail]);
    }
  },
);

test(
  'verified email grants one award and exposes Persian progress only to the account',
  {
    tag: ['@gamification-enabled', '@email-points'],
  },
  async ({ page, request }) => {
    const db = await dbClient();
    const email = `forge-xp-${randomUUID()}@example.test`;
    const rule = forgeConfig.gamification.rules.emailVerified!;
    try {
      expect((await request.get(progressPath)).status()).toBe(401);
      const accountId = await register(page.request, email);
      expect(await (await page.request.get(progressPath)).json()).toMatchObject(
        { points: 0, xp: 0, level: 1, ledger: [] },
      );
      expect(
        (
          await page.request.post(progressPath, {
            headers,
            data: { points: 9999, xp: 9999 },
          })
        ).status(),
      ).toBe(404);
      const { awardBusinessEvent } =
        await import('../apps/api/dist/gamification/award.js');
      const record = () =>
        db.$transaction(
          (tx) => awardBusinessEvent(tx, { kind: 'EMAIL_VERIFIED', accountId }),
          readCommitted,
        );
      await expect(record()).rejects.toThrow(
        'Email verification has not been recorded',
      );

      expect(
        (
          await page.request.post('/api/v1/auth/email/request', { headers })
        ).status(),
      ).toBe(204);
      const message = (await messagesFor(email)).find(
        ({ kind }) => kind === 'VERIFY_EMAIL',
      );
      expect(message?.code).toBeTruthy();
      const verify = () =>
        page.request.post('/api/v1/auth/email/verify', {
          headers,
          data: { code: message?.code },
        });
      expect(
        (await Promise.all([verify(), verify()]))
          .map((response) => response.status())
          .sort(),
      ).toEqual([204, 400]);
      await Promise.all([record(), record()]);
      expect(
        await db.pointEntry.count({
          where: { accountId, event: 'EMAIL_VERIFIED' },
        }),
      ).toBe(1);

      const progress = await page.request.get(progressPath);
      expect(progress.headers()['cache-control']).toBe('no-store');
      const reward = await completionTotals(db, accountId);
      const level = forgeConfig.gamification.levelThresholds.filter(
        (threshold) => threshold <= rule.xp + reward.xp,
      ).length;
      expect(await progress.json()).toMatchObject({
        points: rule.points + reward.points,
        xp: rule.xp + reward.xp,
        level,
        ledger: expect.arrayContaining([
          expect.objectContaining({
            event: 'EMAIL_VERIFIED',
            outcome: 'AWARDED',
          }),
        ]),
      });
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto('/account');
      await page.getByRole('link', { name: progressCopy.title }).click();
      await expect(
        page.getByRole('heading', { name: progressCopy.title }),
      ).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: progressCopy.next }),
      ).toBeVisible();
      await expect(
        page
          .getByRole('listitem')
          .filter({ has: page.locator('time') })
          .filter({ hasText: progressCopy.events.EMAIL_VERIFIED }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(360);
    } finally {
      for (const { path } of await messagesFor(email))
        await rm(path, { force: true });
      await cleanup(db, [email]);
    }
  },
);

test(
  'listing grants serialize against the daily limit and capped events cannot be replayed',
  {
    tag: ['@gamification-enabled', '@listing-points'],
  },
  async ({ request, playwright }) => {
    const db = await dbClient();
    const buyer = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const sellerEmail = `forge-points-seller-${randomUUID()}@example.test`;
    const buyerEmail = `forge-points-buyer-${randomUUID()}@example.test`;
    const rule = forgeConfig.gamification.rules.listingPublished!;
    try {
      const accountId = await register(request, sellerEmail);
      const otherId = await register(buyer, buyerEmail);
      const where = { accountId, event: 'LISTING_PUBLISHED' as const };
      const publish = () =>
        request.post(listingPath, { headers, data: listing });
      expect(
        (
          await request.post(listingPath, {
            headers,
            data: { ...listing, points: 9000, xp: 9000 },
          })
        ).status(),
      ).toBe(400);
      for (let index = 0; index <= rule.dailyLimit; index += 4) {
        const responses = await Promise.all(
          Array.from(
            { length: Math.min(4, rule.dailyLimit + 1 - index) },
            publish,
          ),
        );
        expect(responses.map((response) => response.status())).toEqual(
          Array(responses.length).fill(201),
        );
      }
      const entries = await db.pointEntry.findMany({ where });
      const capped = entries.find(({ outcome }) => outcome === 'CAPPED')!;
      expect(entries).toHaveLength(rule.dailyLimit + 1);
      expect(
        entries.filter(({ outcome }) => outcome === 'AWARDED'),
      ).toHaveLength(rule.dailyLimit);
      expect(capped).toMatchObject({ points: 0, xp: 0 });
      expect(capped.earnedDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const { awardBusinessEvent } =
        await import('../apps/api/dist/gamification/award.js');
      await expect(
        db.$transaction(
          (tx) =>
            awardBusinessEvent(tx, {
              kind: 'LISTING_PUBLISHED',
              accountId: otherId,
              listingId: capped.sourceId,
            }),
          readCommitted,
        ),
      ).rejects.toThrow();
      await db.pointEntry.updateMany({
        where: { accountId },
        data: { earnedDay: '2000-01-01' },
      });
      await Promise.all(
        Array.from({ length: 3 }, () =>
          db.$transaction(
            (tx) =>
              awardBusinessEvent(tx, {
                kind: 'LISTING_PUBLISHED',
                accountId,
                listingId: capped.sourceId,
              }),
            readCommitted,
          ),
        ),
      );
      expect(await db.pointEntry.count({ where })).toBe(rule.dailyLimit + 1);
      expect((await publish()).status()).toBe(201);

      await expect(
        db.$transaction(async (tx) => {
          const transient = await tx.listing.create({
            data: {
              ...listing,
              title: 'بازگردانی آزمایشی',
              ownerId: accountId,
            },
          });
          await awardBusinessEvent(tx, {
            kind: 'LISTING_PUBLISHED',
            accountId,
            listingId: transient.id,
          });
          throw new Error('fixture rollback');
        }, readCommitted),
      ).rejects.toThrow('fixture rollback');
      expect(
        await db.listing.count({
          where: { title: 'بازگردانی آزمایشی', ownerId: accountId },
        }),
      ).toBe(0);
      expect(await db.pointEntry.count({ where })).toBe(rule.dailyLimit + 2);

      const reward = await completionTotals(db, accountId);
      expect(await (await request.get(progressPath)).json()).toMatchObject({
        points: (rule.dailyLimit + 1) * rule.points + reward.points,
        xp: (rule.dailyLimit + 1) * rule.xp + reward.xp,
      });
      expect(
        await (
          await buyer.get(`${progressPath}?accountId=${accountId}`)
        ).json(),
      ).toMatchObject({ points: 0, xp: 0, ledger: [] });
    } finally {
      await buyer.dispose();
      await cleanup(db, [sellerEmail, buyerEmail]);
    }
  },
);

test(
  'configured quests count trusted activity within the window and issue one ledger reward',
  { tag: '@gamification-enabled' },
  async ({ page, request }) => {
    const quest = forgeConfig.gamification.quest;
    const { questWindowStatus, questOccurrence } =
      await import('../apps/api/dist/gamification/quest.js');
    const email = `forge-quest-${randomUUID()}@example.test`;
    const db = await dbClient();
    try {
      const accountId = await register(page.request, email);
      if (!quest) {
        expect(
          await (await page.request.get(progressPath)).json(),
        ).toMatchObject({ quest: null });
        return;
      }
      if (quest.cadence === 'once') {
        const start = Date.parse(quest.startsAt);
        const end = Date.parse(quest.endsAt);
        expect(questWindowStatus(quest, start - 1)).toBe('UPCOMING');
        expect(questWindowStatus(quest, start)).toBe('ACTIVE');
        expect(questWindowStatus(quest, end - 1)).toBe('ACTIVE');
        expect(questWindowStatus(quest, end)).toBe('EXPIRED');
      }
      const { localDay } =
        await import('../apps/api/dist/gamification/calendar.js');
      const today = localDay(new Date());
      const initialStatus =
        quest.cadence === 'once'
          ? questWindowStatus(quest, Date.now())
          : 'ACTIVE';
      const getProgress = async () =>
        await (await page.request.get(progressPath)).json();
      expect(await getProgress()).toMatchObject({
        quest: {
          cadence: quest.cadence,
          day:
            quest.cadence === 'once'
              ? null
              : questOccurrence(quest.cadence, today),
          startsAt: quest.cadence === 'once' ? quest.startsAt : null,
          endsAt: quest.cadence === 'once' ? quest.endsAt : null,
          status: initialStatus,
          current: 0,
          target: quest.target,
          ...quest.reward,
        },
      });
      expect((await request.get(progressPath)).status()).toBe(401);

      const { awardBusinessEvent } =
        await import('../apps/api/dist/gamification/award.js');
      const publishQuestListing = async (
        tx: Parameters<typeof awardBusinessEvent>[0],
      ) => {
        const source = await tx.listing.create({
          data: { ownerId: accountId, ...listing },
        });
        await awardBusinessEvent(tx, {
          kind: 'LISTING_PUBLISHED',
          accountId,
          listingId: source.id,
        });
      };
      await expect(
        db.$transaction(async (tx) => {
          if (quest.event === 'LISTING_PUBLISHED') {
            const { lockAccount } =
              await import('../apps/api/dist/auth/account-transaction.js');
            await lockAccount(tx, accountId);
            await publishQuestListing(tx);
          } else {
            await tx.account.update({
              where: { id: accountId },
              data: { emailVerified: true },
            });
            await awardBusinessEvent(tx, { kind: 'EMAIL_VERIFIED', accountId });
          }
          throw new Error('quest rollback fixture');
        }, readCommitted),
      ).rejects.toThrow('quest rollback fixture');
      expect(await db.questProgress.count({ where: { accountId } })).toBe(0);
      expect(await db.pointEntry.count({ where: { accountId } })).toBe(0);

      let awarded: number;
      if (quest.event === 'LISTING_PUBLISHED') {
        const rule = forgeConfig.gamification.rules.listingPublished!;
        const showIntermediateProgress =
          quest.target > 1 && rule.dailyLimit > 1;
        const publish = () =>
          page.request.post(listingPath, { headers, data: listing });
        if (showIntermediateProgress) {
          expect((await publish()).status()).toBe(201);
          expect(await getProgress()).toMatchObject({
            quest: {
              status: initialStatus,
              current: initialStatus === 'ACTIVE' ? 1 : 0,
            },
          });
        }
        const prior = showIntermediateProgress ? 1 : 0;
        const attempts = Math.min(quest.target, rule.dailyLimit) + 1;
        for (let index = prior; index < attempts; index += 4) {
          const responses = await Promise.all(
            Array.from({ length: Math.min(attempts - index, 4) }, publish),
          );
          expect(responses.map((response) => response.status())).toEqual(
            Array(responses.length).fill(201),
          );
        }
        awarded = Math.min(attempts, rule.dailyLimit);
        const sources = await db.pointEntry.findMany({
          where: { accountId, event: 'LISTING_PUBLISHED' },
        });
        await Promise.all(
          sources.slice(0, 3).map(({ sourceId }) =>
            db.$transaction(
              (tx) =>
                awardBusinessEvent(tx, {
                  kind: 'LISTING_PUBLISHED',
                  accountId,
                  listingId: sourceId,
                }),
              readCommitted,
            ),
          ),
        );
      } else {
        expect(
          (
            await page.request.post('/api/v1/auth/email/request', { headers })
          ).status(),
        ).toBe(204);
        const message = (await messagesFor(email)).find(
          ({ kind }) => kind === 'VERIFY_EMAIL',
        );
        expect(message?.code).toBeTruthy();
        expect(
          (
            await page.request.post('/api/v1/auth/email/verify', {
              headers,
              data: { code: message?.code },
            })
          ).status(),
        ).toBe(204);
        await Promise.all(
          [1, 2].map(() =>
            db.$transaction(
              (tx) =>
                awardBusinessEvent(tx, { kind: 'EMAIL_VERIFIED', accountId }),
              readCommitted,
            ),
          ),
        );
        awarded = 1;
      }
      const current =
        initialStatus === 'ACTIVE' ? Math.min(awarded, quest.target) : 0;
      const completed = current === quest.target;
      const status = completed ? 'COMPLETED' : initialStatus;
      const records = await db.questProgress.findMany({ where: { accountId } });
      const rewards = await db.pointEntry.findMany({
        where: { accountId, event: 'QUEST_COMPLETED' },
      });
      expect(records).toHaveLength(current > 0 ? 1 : 0);
      if (current > 0)
        expect(records[0]).toMatchObject({
          count: current,
          questKey: quest.key,
          occurrence: questOccurrence(quest.cadence, today),
        });
      if (completed) {
        expect(records[0]?.completedAt).toBeInstanceOf(Date);
        expect(rewards).toHaveLength(1);
        expect(rewards[0]).toMatchObject({
          sourceId: records[0]?.id,
          ...quest.reward,
        });
      } else {
        expect(rewards).toHaveLength(0);
      }
      const summary = await getProgress();
      expect(summary.quest).toMatchObject({ status, current });
      const rule =
        forgeConfig.gamification.rules[
          quest.event === 'LISTING_PUBLISHED'
            ? 'listingPublished'
            : 'emailVerified'
        ]!;
      const reward = await completionTotals(db, accountId);
      expect(summary).toMatchObject({
        points: awarded * rule.points + reward.points,
        xp: awarded * rule.xp + reward.xp,
      });
      if (forgeConfig.gamification.achievements.awardCount !== null) {
        expect(summary.achievements).toContainEqual(
          expect.objectContaining({ kind: 'ACTIVITY', current: awarded }),
        );
      }
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto('/progress');
      const questPanel = page.locator('section').filter({
        has: page.getByRole('progressbar', {
          name: progressCopy.questProgress,
        }),
      });
      await expect(
        questPanel.getByRole('heading', { name: quest.title }),
      ).toBeVisible();
      await expect(
        questPanel.getByText(progressCopy.questStatuses[status]),
      ).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: progressCopy.questProgress }),
      ).toHaveAttribute('value', String(current));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(360);
    } finally {
      for (const { path } of await messagesFor(email))
        await rm(path, { force: true });
      await cleanup(db, [email]);
    }
  },
);

test(
  'ordered missions ignore early activity and reward completion once',
  { tag: '@gamification-enabled' },
  async ({ page, request }) => {
    const { mission, quest, rules } = forgeConfig.gamification;
    if (
      !mission ||
      mission.steps
        .map(({ event, target }) => `${event}:${target}`)
        .join(',') !==
        'EMAIL_VERIFIED:1,LISTING_PUBLISHED:2,LISTING_PUBLISHED:1' ||
      (rules.listingPublished?.dailyLimit ?? 0) < 5
    ) {
      return test.skip(
        true,
        'Requires the ordered Marketplace mission example',
      );
    }

    const { awardBusinessEvent } =
      await import('../apps/api/dist/gamification/award.js');
    const { lockAccount } =
      await import('../apps/api/dist/auth/account-transaction.js');
    const email = `forge-mission-${randomUUID()}@example.test`;
    const otherEmail = `forge-mission-${randomUUID()}@example.test`;
    const db = await dbClient();

    try {
      const accountId = await register(page.request, email);
      await register(request, otherEmail);
      const publish = async () => {
        const response = await page.request.post(listingPath, {
          headers,
          data: listing,
        });
        expect(response.status()).toBe(201);
        return (await response.json()).id as string;
      };
      const replay = (listingId: string) =>
        db.$transaction(
          (tx) =>
            awardBusinessEvent(tx, {
              kind: 'LISTING_PUBLISHED',
              accountId,
              listingId,
            }),
          readCommitted,
        );
      const progress = async () =>
        (await (await page.request.get(progressPath)).json()).mission;
      const checkSteps = async (statuses: string[], counts: number[]) =>
        expect(await progress()).toMatchObject({
          steps: mission.steps.map((step, index) => ({
            ...step,
            current: counts[index],
            status: statuses[index],
          })),
        });
      const missionRewards = () =>
        db.pointEntry.findMany({
          where: { accountId, event: 'MISSION_COMPLETED' },
        });

      await checkSteps(['ACTIVE', 'LOCKED', 'LOCKED'], [0, 0, 0]);
      const early = await publish();
      expect(await db.missionProgress.count({ where: { accountId } })).toBe(0);

      expect(
        (
          await page.request.post('/api/v1/auth/email/request', { headers })
        ).status(),
      ).toBe(204);
      const message = (await messagesFor(email)).find(
        ({ kind }) => kind === 'VERIFY_EMAIL',
      );
      expect(message?.code).toBeTruthy();
      const verify = await page.request.post('/api/v1/auth/email/verify', {
        headers,
        data: { code: message?.code },
      });
      expect(verify.status()).toBe(204);
      await replay(early);
      await checkSteps(['COMPLETED', 'ACTIVE', 'LOCKED'], [1, 0, 0]);

      const first = await publish();
      await replay(first);
      await checkSteps(['COMPLETED', 'ACTIVE', 'LOCKED'], [1, 1, 0]);
      await publish();
      await checkSteps(['COMPLETED', 'COMPLETED', 'ACTIVE'], [1, 2, 0]);

      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto('/progress');
      const missionPanel = page.locator('section').filter({
        has: page.locator('ol.progress-ledger'),
      });
      await expect(
        missionPanel.getByRole('heading', { name: mission.title }),
      ).toBeVisible();
      await expect(missionPanel.locator('[aria-current="step"]')).toHaveCount(
        1,
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(360);

      await expect(
        db.$transaction(async (tx) => {
          await lockAccount(tx, accountId);
          const source = await tx.listing.create({
            data: { ...listing, ownerId: accountId },
          });
          await awardBusinessEvent(tx, {
            kind: 'LISTING_PUBLISHED',
            accountId,
            listingId: source.id,
          });
          expect(
            await tx.pointEntry.count({
              where: { accountId, event: 'MISSION_COMPLETED' },
            }),
          ).toBe(1);
          throw new Error('mission rollback fixture');
        }, readCommitted),
      ).rejects.toThrow('mission rollback fixture');
      expect(await missionRewards()).toHaveLength(0);
      await checkSteps(['COMPLETED', 'COMPLETED', 'ACTIVE'], [1, 2, 0]);

      const finalSources = await Promise.all([publish(), publish()]);
      await Promise.all(finalSources.map(replay));
      await checkSteps(['COMPLETED', 'COMPLETED', 'COMPLETED'], [1, 2, 1]);
      expect(await progress()).toMatchObject({
        completed: true,
        ...mission.reward,
      });
      const record = await db.missionProgress.findUniqueOrThrow({
        where: { accountId_missionKey: { accountId, missionKey: mission.key } },
      });
      expect(record).toMatchObject({
        completedSteps: 3,
        stepCount: 0,
        completedAt: expect.any(Date),
      });
      expect(await missionRewards()).toMatchObject([
        { sourceId: record.id, ...mission.reward },
      ]);
      expect(
        await db.pointEntry.count({
          where: { accountId, event: 'LISTING_PUBLISHED', outcome: 'AWARDED' },
        }),
      ).toBe(5);
      if (quest?.cadence === 'daily' && quest.target <= 5) {
        expect(
          await (await page.request.get(progressPath)).json(),
        ).toMatchObject({
          quest: { status: 'COMPLETED', current: quest.target },
          ledger: expect.arrayContaining([
            expect.objectContaining({
              event: 'QUEST_COMPLETED',
              ...quest.reward,
            }),
            expect.objectContaining({
              event: 'MISSION_COMPLETED',
              ...mission.reward,
            }),
          ]),
        });
      }
      expect(await (await request.get(progressPath)).json()).toMatchObject({
        mission: {
          completed: false,
          steps: [
            { status: 'ACTIVE' },
            { status: 'LOCKED' },
            { status: 'LOCKED' },
          ],
        },
      });
      await page.reload();
      await expect(missionPanel.locator('[aria-current="step"]')).toHaveCount(
        0,
      );
      await expect(
        page.getByText(progressCopy.events.MISSION_COMPLETED),
      ).toBeVisible();
    } finally {
      for (const { path } of await messagesFor(email))
        await rm(path, { force: true });
      await cleanup(db, [email, otherEmail]);
    }
  },
);

test(
  'daily quests reset on the configured calendar day and reject old event replays',
  { tag: '@gamification-enabled' },
  async ({ page }) => {
    const quest = forgeConfig.gamification.quest;
    test.skip(quest?.cadence !== 'daily', 'Requires a daily quest');
    if (quest?.cadence !== 'daily') return;

    const { localDay } =
      await import('../apps/api/dist/gamification/calendar.js');
    const { awardBusinessEvent } =
      await import('../apps/api/dist/gamification/award.js');
    const { lockAccount } =
      await import('../apps/api/dist/auth/account-transaction.js');
    if (forgeConfig.timezone === 'Asia/Tehran') {
      expect(localDay(new Date('2026-11-19T20:29:59.999Z'))).toBe('2026-11-19');
      expect(localDay(new Date('2026-11-19T20:30:00.000Z'))).toBe('2026-11-20');
    }
    const today = localDay(new Date());
    const earlier = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const previousDay = localDay(earlier);
    const limit = forgeConfig.gamification.rules.listingPublished!.dailyLimit;
    const email = `forge-daily-quest-${randomUUID()}@example.test`;
    const db = await dbClient();

    try {
      const accountId = await register(page.request, email);
      const event = 'LISTING_PUBLISHED' as const;
      mock.timers.enable({ apis: ['Date'], now: earlier });
      try {
        for (let index = 0; index <= limit; index++) {
          await db.$transaction(async (tx) => {
            await lockAccount(tx, accountId);
            const source = await tx.listing.create({
              data: { ownerId: accountId, ...listing },
            });
            await awardBusinessEvent(tx, {
              kind: event,
              accountId,
              listingId: source.id,
            });
          }, readCommitted);
        }
      } finally {
        mock.timers.reset();
      }

      const previous = await db.questProgress.findUniqueOrThrow({
        where: {
          accountId_questKey_occurrence: {
            accountId,
            questKey: quest.key,
            occurrence: previousDay,
          },
        },
      });
      expect(previous).toMatchObject({
        count: quest.target,
        completedAt: earlier,
      });

      const readProgress = async () =>
        (await page.request.get(progressPath)).json();
      expect(await readProgress()).toMatchObject({
        quest: { cadence: 'daily', day: today, current: 0, status: 'ACTIVE' },
      });

      const oldSources = await db.pointEntry.findMany({
        where: { accountId, event, earnedDay: previousDay },
      });
      expect(oldSources).toHaveLength(limit + 1);
      expect(oldSources.map(({ outcome }) => outcome)).toContain('CAPPED');
      for (const { sourceId } of oldSources) {
        await db.$transaction(
          (tx) =>
            awardBusinessEvent(tx, {
              kind: event,
              accountId,
              listingId: sourceId,
            }),
          readCommitted,
        );
      }
      expect(await readProgress()).toMatchObject({ quest: { current: 0 } });
      expect(
        await db.pointEntry.count({
          where: { accountId, event, earnedDay: today },
        }),
      ).toBe(0);

      for (let index = 0; index < quest.target; index++) {
        const response = await page.request.post(listingPath, {
          headers,
          data: listing,
        });
        expect(response.status()).toBe(201);
      }

      const current = await db.questProgress.findUniqueOrThrow({
        where: {
          accountId_questKey_occurrence: {
            accountId,
            questKey: quest.key,
            occurrence: today,
          },
        },
      });
      expect(current.id).not.toBe(previous.id);
      const rewards = await db.pointEntry.findMany({
        where: { accountId, event: 'QUEST_COMPLETED' },
        select: { sourceId: true, earnedDay: true },
      });
      expect(rewards).toHaveLength(2);
      expect(rewards).toEqual(
        expect.arrayContaining([
          { sourceId: previous.id, earnedDay: previousDay },
          { sourceId: current.id, earnedDay: today },
        ]),
      );
      expect(await readProgress()).toMatchObject({
        quest: { day: today, current: quest.target, status: 'COMPLETED' },
      });
      await page.goto('/progress');
      await expect(page.getByText(progressCopy.questResetsDaily)).toBeVisible();
      await expect(
        page
          .locator('dl')
          .filter({ hasText: progressCopy.questDaily })
          .locator(`time[datetime="${today}"]`),
      ).toBeVisible();
    } finally {
      await cleanup(db, [email]);
    }
  },
);

test(
  'administrator adjustments are audited, idempotent and cannot overdraw or change XP',
  {
    tag: '@gamification-enabled',
  },
  async ({ page, request }) => {
    const db = await dbClient();
    const operatorEmail = `forge-points-admin-${randomUUID()}@example.test`;
    const targetEmail = `forge-points-member-${randomUUID()}@example.test`;
    try {
      const operatorId = await register(page.request, operatorEmail);
      const targetId = await register(request, targetEmail);
      await db.account.update({
        where: { id: operatorId },
        data: { role: 'ADMIN' },
      });
      const path = `/api/v1/gamification/accounts/${targetId}/adjustments`;
      const credit = {
        requestId: randomUUID(),
        points: 50,
        reason: 'اصلاح امتیاز',
      };
      const send = (data: typeof credit) =>
        page.request.post(path, { headers, data });

      expect(
        (await request.post(path, { headers, data: credit })).status(),
      ).toBe(403);
      expect(
        (
          await page.request.post(path, {
            headers: { origin: 'https://example.test' },
            data: credit,
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await page.request.post(
            `/api/v1/gamification/accounts/${operatorId}/adjustments`,
            { headers, data: credit },
          )
        ).status(),
      ).toBe(403);
      expect((await send({ ...credit, points: 0 })).status()).toBe(400);
      expect((await send({ ...credit, reason: ' ' })).status()).toBe(400);
      expect(
        (await Promise.all([send(credit), send(credit)])).map((result) =>
          result.status(),
        ),
      ).toEqual([204, 204]);
      expect((await send({ ...credit, points: 51 })).status()).toBe(409);

      const withdrawals = await Promise.all([
        send({ requestId: randomUUID(), points: -40, reason: 'اصلاح دوباره' }),
        send({ requestId: randomUUID(), points: -40, reason: 'اصلاح دوباره' }),
      ]);
      expect(withdrawals.map((result) => result.status()).sort()).toEqual([
        204, 409,
      ]);
      expect(await (await request.get(progressPath)).json()).toMatchObject({
        points: 10,
        xp: 0,
        level: 1,
        daily: { current: 0, longest: 0 },
      });
      const entries = await db.pointEntry.findMany({
        where: { accountId: targetId },
      });
      expect(entries).toHaveLength(2);
      expect(
        entries.find(({ sourceId }) => sourceId === credit.requestId),
      ).toMatchObject({
        event: 'ADMIN_ADJUSTMENT',
        actorId: operatorId,
        reason: credit.reason,
        points: 50,
        xp: 0,
      });
      expect(await (await request.get(progressPath)).text()).not.toContain(
        credit.reason,
      );

      await page.goto('/admin');
      await page.getByLabel('جست‌وجوی نام یا ایمیل').fill(targetEmail);
      await page.getByRole('link', { name: progressCopy.adjust }).click();
      await page.getByLabel(progressCopy.adjustmentAmount).fill('۵');
      await page.getByLabel(progressCopy.reason).fill('فرم آزمایشی');
      await page.getByRole('button', { name: 'ذخیره' }).click();
      await expect(
        page.getByRole('status').getByText('تغییرات ذخیره شد.'),
      ).toBeVisible();
      expect(await (await request.get(progressPath)).json()).toMatchObject({
        points: 15,
        xp: 0,
      });
    } finally {
      await cleanup(db, [operatorEmail, targetEmail]);
    }
  },
);

test(
  'earned activity yields badges and streaks while rankings require explicit opt-in',
  {
    tag: '@gamification-enabled',
  },
  async ({ page, request, playwright }) => {
    const db = await dbClient();
    const second = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const firstEmail = `forge-rank-first-${randomUUID()}@example.test`;
    const secondEmail = `forge-rank-second-${randomUUID()}@example.test`;
    const hiddenEmail = `forge-rank-hidden-${randomUUID()}@example.test`;
    const { localDay, periodStart } =
      await import('../apps/api/dist/gamification/calendar.js');
    expect(periodStart('monthly', '2025-04-01')).toBe('2025-03-21');
    expect(periodStart('weekly', '2025-03-23')).toBe('2025-03-22');
    const today = localDay(new Date());
    const past = (days: number) =>
      new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000)
        .toISOString()
        .slice(0, 10);
    try {
      const first = await register(page.request, firstEmail);
      const secondId = await register(second, secondEmail);
      const hidden = await register(request, hiddenEmail);
      await db.account.update({
        where: { id: first },
        data: { name: 'بازیکن اول' },
      });
      await db.account.update({
        where: { id: secondId },
        data: { name: 'بازیکن دوم' },
      });
      await db.account.update({
        where: { id: hidden },
        data: { name: 'بازیکن خصوصی' },
      });
      await db.pointEntry.createMany({
        data: [
          { accountId: first, earnedDay: today, xp: 20 },
          { accountId: first, earnedDay: past(1), xp: 20 },
          { accountId: first, earnedDay: past(7), xp: 30 },
          { accountId: secondId, earnedDay: today, xp: 70 },
          { accountId: hidden, earnedDay: today, xp: 900 },
        ].map((entry) => ({
          ...entry,
          event: 'LISTING_PUBLISHED',
          outcome: 'AWARDED',
          sourceId: randomUUID(),
          points: 2,
        })),
      });

      const leaderboard = '/api/v1/gamification/leaderboard';
      const preference = '/api/v1/gamification/preferences';
      expect(await (await second.get(leaderboard)).json()).toEqual({
        rows: [],
        myRank: null,
        hasNext: false,
      });
      const summary = await (await page.request.get(progressPath)).json();
      expect(summary).toMatchObject({
        leaderboardOptIn: false,
        daily: { current: 2, longest: 2 },
        weekly: { current: 2, longest: 2 },
      });
      expect(summary.recentDays).toHaveLength(14);
      expect(summary.recentDays.at(-1)).toEqual({ day: today, active: true });
      for (const [kind, target, current] of [
        ['ACTIVITY', forgeConfig.gamification.achievements.awardCount, 3],
        ['XP', forgeConfig.gamification.achievements.xpMilestone, 70],
      ] as const) {
        if (target !== null)
          expect(summary.achievements).toContainEqual({
            kind,
            target,
            current,
            unlocked: current >= target,
          });
      }

      await page.goto('/progress');
      await expect(
        page.getByRole('list', { name: progressCopy.recentDays }),
      ).toBeVisible();
      await page.getByRole('checkbox', { name: progressCopy.optIn }).check();
      await expect(
        page.getByRole('checkbox', { name: progressCopy.optIn }),
      ).toBeChecked();
      await expect(
        page.getByRole('checkbox', { name: progressCopy.optIn }),
      ).toBeEnabled();
      expect(
        (
          await second.patch(preference, {
            headers,
            data: { leaderboardOptIn: true },
          })
        ).status(),
      ).toBe(204);
      const ranked = await (await page.request.get(leaderboard)).json();
      expect(ranked.rows).toEqual(
        expect.arrayContaining([
          { rank: 1, name: 'بازیکن اول', xp: 70, isMe: true },
          { rank: 1, name: 'بازیکن دوم', xp: 70, isMe: false },
        ]),
      );
      expect(ranked.rows).toHaveLength(2);
      expect(ranked.myRank).toBe(1);
      expect(
        await (await page.request.get(`${leaderboard}?page=2`)).json(),
      ).toMatchObject({ rows: [], myRank: 1 });
      expect(
        await (await page.request.get(`${leaderboard}?period=daily`)).json(),
      ).toMatchObject({
        rows: [
          { rank: 1, name: 'بازیکن دوم', xp: 70 },
          { rank: 2, name: 'بازیکن اول', xp: 20 },
        ],
      });

      await page.getByRole('link', { name: progressCopy.leaderboard }).click();
      await expect(
        page.getByRole('heading', { name: progressCopy.leaderboard }),
      ).toBeVisible();
      await expect(
        page.getByRole('row').filter({ hasText: 'بازیکن اول' }),
      ).toBeVisible();
      await expect(page.getByText('بازیکن خصوصی')).toHaveCount(0);
      await page.goto('/progress');
      await page.getByRole('checkbox', { name: progressCopy.optIn }).uncheck();
      await expect(
        page.getByRole('checkbox', { name: progressCopy.optIn }),
      ).not.toBeChecked();
      await expect(
        page.getByRole('checkbox', { name: progressCopy.optIn }),
      ).toBeEnabled();
      await db.account.update({
        where: { id: secondId },
        data: { suspendedAt: new Date() },
      });
      expect(await (await request.get(leaderboard)).json()).toEqual({
        rows: [],
        myRank: null,
        hasNext: false,
      });
    } finally {
      await second.dispose();
      await cleanup(db, [firstEmail, secondEmail, hiddenEmail]);
    }
  },
);
