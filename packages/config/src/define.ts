import { z } from 'zod';
import { templateIds, templateRegistry } from './templates.ts';

export const apiPrefix = 'api/v1';

const timezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('fa-IR', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'منطقهٔ زمانی معتبر نیست');

const defaultPort = 4000;
const port = z.number().int().min(1).max(65535);
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

const rewardAmounts = {
  points: z.number().int().min(0).max(1000),
  xp: z.number().int().min(0).max(1000),
};
const hasReward = ({ points, xp }: { points: number; xp: number }) =>
  points > 0 || xp > 0;
const rewardMessage = 'برای پاداش، امتیاز یا تجربه تعیین کنید.';

const earningRule = z
  .strictObject({
    ...rewardAmounts,
    dailyLimit: z.number().int().min(1).max(100),
  })
  .refine(hasReward, rewardMessage);

const campaignFields = {
  key: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  title: z.string().trim().min(1).max(100),
  reward: z.strictObject(rewardAmounts).refine(hasReward, rewardMessage),
};
const target = z.number().int().min(1).max(100);
export const rewardEvents = [
  'EMAIL_VERIFIED',
  'LISTING_PUBLISHED',
  'POST_PUBLISHED',
  'LESSON_COMPLETED',
] as const;
export const earningRuleKeys = {
  EMAIL_VERIFIED: 'emailVerified',
  LISTING_PUBLISHED: 'listingPublished',
  POST_PUBLISHED: 'postPublished',
  LESSON_COMPLETED: 'lessonCompleted',
} as const;
const awardableEvent = z.enum(rewardEvents);
const utcWindow = { startsAt: z.iso.datetime(), endsAt: z.iso.datetime() };
const orderedWindow = ({
  startsAt,
  endsAt,
}: {
  startsAt: string;
  endsAt: string;
}) => Date.parse(startsAt) < Date.parse(endsAt);

const oneTimeQuest = z
  .strictObject({
    ...campaignFields,
    target,
    cadence: z.literal('once').default('once'),
    event: awardableEvent,
    ...utcWindow,
  })
  .refine(orderedWindow, {
    path: ['endsAt'],
    message: 'پایان مأموریت باید پس از آغاز آن باشد.',
  })
  .refine(({ event, target }) => event !== 'EMAIL_VERIFIED' || target === 1, {
    path: ['target'],
    message: 'تأیید ایمیل یک‌بار برای هر حساب ثبت می‌شود.',
  });

const quest = z.union([
  oneTimeQuest,
  z.strictObject({
    ...campaignFields,
    target,
    cadence: z.enum(['daily', 'weekly']),
    event: awardableEvent.exclude(['EMAIL_VERIFIED']),
  }),
]);

const challenge = z
  .strictObject({
    ...campaignFields,
    ...utcWindow,
    mode: z.enum(['individual', 'group']).default('individual'),
    event: awardableEvent,
    target,
  })
  .refine(orderedWindow, { path: ['endsAt'] })
  .refine(
    ({ mode, event, target }) =>
      mode === 'group' || event !== 'EMAIL_VERIFIED' || target === 1,
    { path: ['target'] },
  );

const season = z
  .strictObject({
    title: campaignFields.title,
    ...utcWindow,
  })
  .refine(orderedWindow, { path: ['endsAt'] });

const mission = z
  .strictObject({
    ...campaignFields,
    requiresQuest: campaignFields.key.optional(),
    steps: z
      .array(z.strictObject({ event: awardableEvent, target }))
      .min(2)
      .max(10),
  })
  .refine(
    ({ steps }) =>
      steps.every(
        ({ event, target }, index) =>
          event !== 'EMAIL_VERIFIED' || (index === 0 && target === 1),
      ),
    {
      path: ['steps'],
      message: 'تأیید ایمیل فقط به‌عنوان مرحلهٔ اول و با هدف یک مجاز است.',
    },
  );

const rewardCatalog = z
  .array(
    z.strictObject({
      key: campaignFields.key,
      title: campaignFields.title,
      description: z.string().trim().min(1).max(240),
      cost: z.number().int().min(1).max(1_000_000),
    }),
  )
  .max(20)
  .refine(
    (rewards) => new Set(rewards.map(({ key }) => key)).size === rewards.length,
    'کلید پاداش‌ها باید یکتا باشد.',
  );

const badges = z
  .array(
    z.strictObject({
      key: campaignFields.key,
      title: campaignFields.title,
      category: z.enum(['activity', 'xp']),
      rarity: z.enum(['common', 'rare', 'epic']),
      target: z.number().int().min(1).max(1_000_000_000),
      requires: campaignFields.key.optional(),
    }),
  )
  .max(20)
  .refine((items) => {
    const known = new Set<string>();
    for (const item of items) {
      if (known.has(item.key) || (item.requires && !known.has(item.requires)))
        return false;
      known.add(item.key);
    }
    return true;
  });

const levelBenefits = z
  .array(
    z.strictObject({
      level: z.number().int().min(1).max(50),
      percent: z.number().int().min(1).max(50),
    }),
  )
  .max(50)
  .refine(
    (items) => new Set(items.map(({ level }) => level)).size === items.length,
  );

const levelThresholds = z
  .array(z.number().int().min(0).max(1_000_000_000))
  .min(2)
  .max(50)
  .refine(
    (values) =>
      values[0] === 0 &&
      values.every((value, index) => index === 0 || value > values[index - 1]!),
    'آستانه‌های سطح باید از صفر شروع شوند و صعودی باشند.',
  );

const configSchema = z.strictObject({
  project: z.strictObject({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    symbol: z.string().trim().min(1).max(4),
  }),
  template: z.enum(templateIds).default('saas'),
  theme: z.enum(['professional', 'dark', 'vibrant']).default('professional'),
  locale: z.literal('fa-IR').default('fa-IR'),
  timezone: timezone.default('Asia/Tehran'),
  digits: z.enum(['persian', 'latin']).default('persian'),
  pwa: z
    .strictObject({
      enabled: z.boolean().default(true),
      shortName: z.string().trim().min(1).max(32).optional(),
      themeColor: hexColor.default('#246146'),
      backgroundColor: hexColor.default('#f5f7f3'),
      revision: z
        .string()
        .regex(/^[a-zA-Z0-9_-]{1,32}$/)
        .default('1'),
    })
    .prefault({}),
  gamification: z
    .strictObject({
      quest: quest.nullable().default(null),
      mission: mission.nullable().default(null),
      rewards: rewardCatalog.default([]),
      challenge: challenge.nullable().default(null),
      season: season.nullable().default(null),
      referralReward: campaignFields.reward.nullable().default(null),
      badges: badges.default([]),
      levelBenefits: levelBenefits.default([]),
      streakProtectionCost: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .nullable()
        .default(null),
      streakEvents: z
        .array(awardableEvent)
        .min(1)
        .max(rewardEvents.length)
        .default([...rewardEvents]),
      levelThresholds: levelThresholds.default([0, 50, 150, 350]),
      achievements: z
        .strictObject({
          awardCount: z.number().int().min(1).max(10_000).nullable().default(1),
          xpMilestone: z
            .number()
            .int()
            .min(1)
            .max(1_000_000_000)
            .nullable()
            .default(100),
        })
        .prefault({}),
      rules: z
        .strictObject({
          emailVerified: earningRule
            .nullable()
            .default({ points: 25, xp: 50, dailyLimit: 1 }),
          listingPublished: earningRule
            .nullable()
            .default({ points: 10, xp: 20, dailyLimit: 3 }),
          postPublished: earningRule
            .nullable()
            .default({ points: 5, xp: 10, dailyLimit: 3 }),
          lessonCompleted: earningRule
            .nullable()
            .default({ points: 10, xp: 20, dailyLimit: 10 }),
        })
        .prefault({}),
    })
    .prefault({}),
  navigation: z
    .strictObject({
      showStatusShortcut: z.boolean().default(true),
    })
    .prefault({}),
  features: z
    .strictObject({
      apiDocs: z.boolean().optional(),
      workspaceAdmin: z.boolean().optional(),
      marketplace: z.boolean().optional(),
      gamification: z.boolean().optional(),
      booking: z.boolean().optional(),
      community: z.boolean().optional(),
      learning: z.boolean().optional(),
      assistant: z.boolean().optional(),
    })
    .prefault({}),
  api: z
    .strictObject({
      port: port.default(defaultPort),
    })
    .prefault({}),
});

export type ForgeConfigInput = z.input<typeof configSchema>;

export function defineForgeConfig(input: ForgeConfigInput) {
  const config = configSchema.parse(input);
  const defaults = templateRegistry[config.template].features;
  const features = {
    apiDocs: config.features.apiDocs ?? defaults.apiDocs,
    workspaceAdmin: config.features.workspaceAdmin ?? defaults.workspaceAdmin,
    marketplace: config.features.marketplace ?? defaults.marketplace,
    gamification: config.features.gamification ?? defaults.gamification,
    booking: config.features.booking ?? defaults.booking,
    community: config.features.community ?? defaults.community,
    learning: config.features.learning ?? defaults.learning,
    assistant: config.features.assistant ?? defaults.assistant,
  };
  const { quest, mission, rules, challenge, referralReward } =
    config.gamification;
  const enabledRules = {
    EMAIL_VERIFIED: rules.emailVerified,
    LISTING_PUBLISHED: features.marketplace ? rules.listingPublished : null,
    POST_PUBLISHED: features.community ? rules.postPublished : null,
    LESSON_COMPLETED: features.learning ? rules.lessonCompleted : null,
  };
  if (features.gamification && quest) {
    const rule = enabledRules[quest.event];
    if (!rule) {
      throw new Error('رویداد مأموریت در تنظیمات فورج فعال نیست.');
    }
    if (quest.cadence === 'daily' && quest.target > rule.dailyLimit) {
      throw new Error('هدف مأموریت روزانه باید در سقف روزانهٔ امتیازدهی بگنجد.');
    }
  }
  if (
    features.gamification &&
    mission?.steps.some(({ event }) => !enabledRules[event])
  ) {
    throw new Error(
      'رویداد یکی از مرحله‌های مأموریت در تنظیمات فورج فعال نیست.',
    );
  }
  if (features.gamification && challenge && !enabledRules[challenge.event])
    throw new Error('رویداد چالش در تنظیمات فورج فعال نیست.');
  if (features.gamification && referralReward && !rules.emailVerified)
    throw new Error('پاداش معرفی به قانون تأیید ایمیل نیاز دارد.');
  if (
    mission?.requiresQuest &&
    (quest?.cadence !== 'once' || quest.key !== mission.requiresQuest)
  )
    throw new Error('پیش‌نیاز باید کلید مأموریت یک‌بارهٔ فعال باشد.');
  if (
    config.gamification.levelBenefits.some(
      ({ level }) => level > config.gamification.levelThresholds.length,
    )
  )
    throw new Error('سطح مزیت در آستانه‌های سطح تعریف نشده است.');
  return {
    ...config,
    features,
  };
}

export type ForgeConfig = ReturnType<typeof defineForgeConfig>;

export function resolveApiPort(config: ForgeConfig, override?: string): number {
  return override === undefined
    ? config.api.port
    : port.parse(Number(override));
}

export function resolveApiOrigin(
  config: ForgeConfig,
  override?: string,
): string {
  const url = new URL(override ?? `http://127.0.0.1:${config.api.port}`);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('FORGE_API_ORIGIN must be a plain HTTP(S) origin.');
  }
  return url.origin;
}
