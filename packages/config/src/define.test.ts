import { expect, test } from 'vitest';
import { defineForgeConfig, resolveApiOrigin, resolveApiPort } from './define';

const project = { name: 'فورج', description: 'زیرساخت برنامه', symbol: 'ف' };

test('applies Persian defaults and preserves a valid API override', () => {
  const config = defineForgeConfig({ project, api: { port: 4400 } });
  expect(config).toMatchObject({
    locale: 'fa-IR',
    timezone: 'Asia/Tehran',
    digits: 'persian',
    features: { apiDocs: true },
    api: { port: 4400 },
  });
  expect(resolveApiPort(config)).toBe(4400);
  expect(resolveApiPort(config, '4401')).toBe(4401);
  expect(resolveApiOrigin(config)).toBe('http://127.0.0.1:4400');
});

test('rejects unknown configuration keys and invalid timezones', () => {
  expect(() => defineForgeConfig({ project, timezone: 'unknown' })).toThrow(
    'timezone',
  );
  expect(() => defineForgeConfig({ project, ...{ themes: {} } })).toThrow(
    'themes',
  );
});

test('rejects invalid ports and upstream URLs with credentials or paths', () => {
  const config = defineForgeConfig({ project });
  expect(() => resolveApiPort(config, '0')).toThrow();
  expect(() => resolveApiOrigin(config, 'http://localhost/health')).toThrow();
  expect(() =>
    resolveApiOrigin(config, 'https://user:pass@localhost'),
  ).toThrow();
});

test('PWA branding and revisions are validated', () => {
  const { project } = defineForgeConfig({
    project: { name: 'فورج', description: 'نمونه', symbol: 'ف' },
  });
  expect(defineForgeConfig({ project }).pwa).toMatchObject({
    enabled: true,
    themeColor: '#246146',
    revision: '1',
  });
  expect(
    defineForgeConfig({
      project,
      pwa: { enabled: false, shortName: 'نمونه', revision: 'release-2' },
    }).pwa,
  ).toMatchObject({
    enabled: false,
    shortName: 'نمونه',
    revision: 'release-2',
  });
  expect(() =>
    defineForgeConfig({
      project,
      pwa: { themeColor: 'url(example)', revision: '../bad' },
    }),
  ).toThrow();
});

test('gamification validates earning rules and strictly ascending level thresholds', () => {
  const project = { name: 'فورج', description: 'نمونه', symbol: 'ف' };
  expect(defineForgeConfig({ project }).features.gamification).toBe(false);
  expect(
    defineForgeConfig({ project, template: 'marketplace' }).features
      .gamification,
  ).toBe(false);
  expect(
    defineForgeConfig({
      project,
      features: { gamification: true },
      gamification: {
        levelThresholds: [0, 25, 100],
        rules: { listingPublished: null },
      },
    }).gamification,
  ).toMatchObject({
    levelThresholds: [0, 25, 100],
    rules: { listingPublished: null },
  });
  for (const levelThresholds of [
    [1, 5],
    [0, 20, 20],
    [0, 4, 2],
  ]) {
    expect(() =>
      defineForgeConfig({ project, gamification: { levelThresholds } }),
    ).toThrow();
  }
  expect(() =>
    defineForgeConfig({
      project,
      gamification: {
        rules: { emailVerified: { points: 0, xp: 0, dailyLimit: 1 } },
      },
    }),
  ).toThrow();
});

test('quests require an ordered UTC window, an enabled source and a positive reward', () => {
  const quest = {
    key: 'first-listings',
    title: 'انتشار دو آگهی',
    event: 'LISTING_PUBLISHED',
    target: 2,
    startsAt: '2026-11-01T00:00:00Z',
    endsAt: '2026-12-01T00:00:00Z',
    reward: { points: 50, xp: 25 },
  } as const;
  const features = { gamification: true };
  const config = { project, template: 'marketplace', features } as const;
  expect(defineForgeConfig({ project }).gamification.quest).toBeNull();
  expect(
    defineForgeConfig({ ...config, gamification: { quest } }).gamification
      .quest,
  ).toEqual({ ...quest, cadence: 'once' });
  for (const invalid of [
    { ...quest, startsAt: quest.endsAt },
    { ...quest, endsAt: '2026-12-01T00:00:00' },
    { ...quest, reward: { points: 0, xp: 0 } },
    { ...quest, event: 'EMAIL_VERIFIED' as const },
  ]) {
    expect(() =>
      defineForgeConfig({ ...config, gamification: { quest: invalid } }),
    ).toThrow();
  }
  expect(() =>
    defineForgeConfig({ project, features, gamification: { quest } }),
  ).toThrow();
  expect(() =>
    defineForgeConfig({
      ...config,
      gamification: { quest, rules: { listingPublished: null } },
    }),
  ).toThrow();
});

test('daily quests require a repeatable source and a target within its daily limit', () => {
  const quest = {
    key: 'daily-listings',
    title: 'آگهی‌های امروز',
    cadence: 'daily',
    event: 'LISTING_PUBLISHED',
    target: 2,
    reward: { points: 50, xp: 25 },
  } as const;
  const config = {
    project,
    template: 'marketplace',
    features: { gamification: true },
  } as const;
  expect(
    defineForgeConfig({ ...config, gamification: { quest } }).gamification
      .quest,
  ).toEqual(quest);
  expect(() =>
    defineForgeConfig({
      ...config,
      gamification: {
        quest,
        rules: { listingPublished: { points: 10, xp: 20, dailyLimit: 1 } },
      },
    }),
  ).toThrow('سقف روزانه');
  expect(() =>
    defineForgeConfig({
      ...config,
      // @ts-expect-error Daily quests must reject nonrepeatable sources at runtime as well.
      gamification: { quest: { ...quest, event: 'EMAIL_VERIFIED', target: 1 } },
    }),
  ).toThrow();
});

test('ordered missions validate steps and require their earning rules', () => {
  const email = { event: 'EMAIL_VERIFIED', target: 1 } as const;
  const listing = { event: 'LISTING_PUBLISHED', target: 2 } as const;
  const mission = {
    key: 'marketplace-onboarding',
    title: 'آغاز فروش',
    steps: [email, listing, listing],
    reward: { points: 50, xp: 25 },
  };
  const features = { gamification: true };
  const config = { project, template: 'marketplace', features } as const;
  expect(defineForgeConfig({ project }).gamification.mission).toBeNull();
  expect(
    defineForgeConfig({ ...config, gamification: { mission } }).gamification
      .mission,
  ).toEqual(mission);
  for (const steps of [
    [listing],
    [listing, email],
    [email, listing, email],
    [{ ...email, target: 2 }, listing],
  ]) {
    expect(() =>
      defineForgeConfig({
        ...config,
        gamification: { mission: { ...mission, steps } },
      }),
    ).toThrow();
  }
  expect(() =>
    defineForgeConfig({ project, features, gamification: { mission } }),
  ).toThrow();
  expect(() =>
    defineForgeConfig({
      ...config,
      gamification: { mission, rules: { emailVerified: null } },
    }),
  ).toThrow();
});

test('a reward catalog defaults to empty and validates unique keys and point costs', () => {
  const item = {
    key: 'local-receipt',
    title: 'رسید تمرینی',
    description: 'ثبت یک رسید محلی',
    cost: 50,
  };
  expect(defineForgeConfig({ project }).gamification.rewards).toEqual([]);
  expect(
    defineForgeConfig({ project, gamification: { rewards: [item] } })
      .gamification.rewards,
  ).toEqual([item]);
  for (const rewards of [
    [item, item],
    [{ ...item, cost: 0 }],
    [{ ...item, cost: 1.5 }],
    [{ ...item, key: '../reward' }],
    [{ ...item, description: ' ' }],
  ]) {
    expect(() =>
      defineForgeConfig({ project, gamification: { rewards } }),
    ).toThrow();
  }
});

test('advanced campaigns validate feature sources, ordered windows and progression prerequisites', () => {
  const window = {
    startsAt: '2026-11-01T00:00:00Z',
    endsAt: '2026-12-01T00:00:00Z',
  };
  const reward = { points: 10, xp: 5 };
  const challenge = {
    key: 'study',
    title: 'مطالعه',
    target: 2,
    event: 'LESSON_COMPLETED',
    ...window,
    reward,
  } as const;
  const features = { gamification: true };
  expect(
    defineForgeConfig({
      project,
      template: 'learning',
      features,
      gamification: { challenge },
    }).gamification.challenge,
  ).toMatchObject({ mode: 'individual' });
  expect(() =>
    defineForgeConfig({ project, features, gamification: { challenge } }),
  ).toThrow();
  expect(() =>
    defineForgeConfig({
      project,
      template: 'learning',
      features,
      gamification: { challenge: { ...challenge, endsAt: window.startsAt } },
    }),
  ).toThrow();
  expect(() =>
    defineForgeConfig({
      project,
      features,
      gamification: { referralReward: reward, rules: { emailVerified: null } },
    }),
  ).toThrow();
  expect(() =>
    defineForgeConfig({
      project,
      gamification: {
        badges: [
          {
            key: 'next',
            title: 'بعدی',
            category: 'activity',
            rarity: 'rare',
            target: 2,
            requires: 'missing',
          },
        ],
      },
    }),
  ).toThrow();
  expect(() =>
    defineForgeConfig({
      project,
      gamification: { levelBenefits: [{ level: 50, percent: 20 }] },
    }),
  ).toThrow();
});
