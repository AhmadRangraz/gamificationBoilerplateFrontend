export const templateIds = [
  'saas',
  'marketplace',
  'booking',
  'community',
  'learning',
  'ai',
] as const;
export type TemplateId = (typeof templateIds)[number];

export const featureIds = [
  'apiDocs',
  'workspaceAdmin',
  'marketplace',
  'gamification',
  'booking',
  'community',
  'learning',
  'assistant',
] as const;
export type FeatureId = (typeof featureIds)[number];

export const featureRegistry = {
  apiDocs: 'Swagger documentation in development',
  workspaceAdmin: 'Administrator workspace management',
  gamification: 'Account points ledger and XP progression',
  marketplace: 'Public listings, seller tools and favorites',
  booking: 'Services, availability and appointments',
  community: 'Posts, comments, reactions and notifications',
  learning: 'Courses, lessons and learner progress',
  assistant: 'Local streaming assistant and conversation history',
} satisfies Record<FeatureId, string>;

const base = {
  apiDocs: true,
  workspaceAdmin: false,
  marketplace: false,
  gamification: false,
  booking: false,
  community: false,
  learning: false,
  assistant: false,
};

export const templateRegistry = {
  saas: {
    label: 'SaaS / Admin',
    features: {
      ...base,
      workspaceAdmin: true,
      marketplace: false,
      gamification: false,
    },
  },
  marketplace: {
    label: 'Marketplace',
    features: {
      ...base,
      workspaceAdmin: false,
      marketplace: true,
      gamification: false,
    },
  },
  booking: {
    label: 'Booking / Services',
    features: { ...base, booking: true },
  },
  community: {
    label: 'Community / Social',
    features: { ...base, community: true },
  },
  learning: {
    label: 'Learning / Education',
    features: { ...base, learning: true },
  },
  ai: { label: 'AI Application', features: { ...base, assistant: true } },
} satisfies Record<
  TemplateId,
  { label: string; features: Record<FeatureId, boolean> }
>;

export const plannedTemplates: readonly string[] = [];
