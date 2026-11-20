import { defineForgeConfig } from './packages/config/src/define.ts';

const demoWindow = {
  startsAt: '2026-11-19T00:00:00Z',
  endsAt: '2027-02-01T00:00:00Z',
};

export default defineForgeConfig({
  project: {
    name: 'فورج',
    description: 'زیرساخت ساخت و توسعهٔ برنامه‌های فارسی',
    symbol: 'ف',
  },
  template: 'saas',
  features: {
    apiDocs: true,
    workspaceAdmin: true,
    marketplace: true,
    booking: true,
    community: true,
    learning: true,
    assistant: true,
    gamification: true,
  },
  gamification: {
    rules: {
      listingPublished: { points: 10, xp: 20, dailyLimit: 5 },
      postPublished: { points: 10, xp: 10, dailyLimit: 5 },
      lessonCompleted: { points: 15, xp: 20, dailyLimit: 5 },
    },
    quest: {
      key: 'demo-learning-daily',
      title: 'یادگیری روزانه',
      cadence: 'daily',
      event: 'LESSON_COMPLETED',
      target: 1,
      reward: { points: 25, xp: 20 },
    },
    mission: {
      key: 'demo-getting-started',
      title: 'شروع کار با فورج',
      steps: [
        { event: 'LESSON_COMPLETED', target: 1 },
        { event: 'POST_PUBLISHED', target: 1 },
      ],
      reward: { points: 50, xp: 40 },
    },
    rewards: [
      {
        key: 'demo-receipt',
        title: 'رسید تمرینی',
        description: 'ثبت یک رسید محلی با امتیازهای فورج',
        cost: 20,
      },
    ],
    challenge: {
      key: 'demo-community-launch',
      title: 'چالش آغاز انجمن',
      mode: 'group',
      event: 'POST_PUBLISHED',
      target: 2,
      reward: { points: 15, xp: 10 },
      ...demoWindow,
    },
    season: { title: 'فصل آغاز فورج', ...demoWindow },
    referralReward: { points: 10, xp: 5 },
    streakProtectionCost: 3,
    levelBenefits: [{ level: 2, percent: 20 }],
    badges: [
      {
        key: 'demo-first-activity',
        title: 'اولین فعالیت',
        category: 'activity',
        rarity: 'common',
        target: 1,
      },
    ],
  },
});
