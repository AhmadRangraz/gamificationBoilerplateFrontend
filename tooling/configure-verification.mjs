import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { format } from 'prettier';

// Apply only to a fresh generated verification project.
const [directory, mode = 'group'] = process.argv.slice(2);
if (!directory || !['group', 'individual'].includes(mode))
  throw new Error(
    'Provide a generated checkout and optionally group or individual.',
  );
const path = resolve(directory, 'forge.config.ts');
const source = await readFile(path, 'utf8');
if (source.includes('gamification:'))
  throw new Error('Expected a fresh generated config.');
const { default: config } = await import(pathToFileURL(path));
const { project, template } = config;
const days = (offset) => new Date(Date.now() + offset * 86400000).toISOString();
const window = { startsAt: days(-2), endsAt: days(2) };
const gamification =
  template === 'marketplace'
    ? {
        rules: { listingPublished: { points: 10, xp: 20, dailyLimit: 5 } },
        quest: {
          key: 'daily',
          title: 'آگهی روزانه',
          cadence: mode === 'individual' ? 'weekly' : 'daily',
          event: 'LISTING_PUBLISHED',
          target: 2,
          reward: { points: 50, xp: 25 },
        },
        mission: {
          key: 'seller',
          title: 'آغاز فروش',
          steps: [
            { event: 'EMAIL_VERIFIED', target: 1 },
            { event: 'LISTING_PUBLISHED', target: 2 },
            { event: 'LISTING_PUBLISHED', target: 1 },
          ],
          reward: { points: 75, xp: 40 },
        },
        rewards: [
          {
            key: 'practice-receipt',
            title: 'رسید تمرینی',
            description: 'ثبت یک رسید محلی',
            cost: 20,
          },
        ],
        challenge: {
          key: 'launch',
          title: 'چالش آغاز',
          mode,
          event: 'LISTING_PUBLISHED',
          target: 2,
          reward: { points: 15, xp: 10 },
          ...window,
        },
        season: { title: 'فصل آغاز', ...window },
        referralReward: { points: 10, xp: 5 },
        streakProtectionCost: 3,
        levelBenefits: [{ level: 2, percent: 20 }],
        badges: [
          {
            key: 'first-award',
            title: 'اولین فعالیت',
            category: 'activity',
            rarity: 'common',
            target: 1,
          },
          {
            key: 'experience',
            title: 'تجربهٔ تازه',
            category: 'xp',
            rarity: 'rare',
            target: 100,
            requires: 'first-award',
          },
        ],
      }
    : {};
await writeFile(
  path,
  await format(
    `import { defineForgeConfig } from './packages/config/src/define.ts';\n\nexport default defineForgeConfig(${JSON.stringify({ project, template, features: { gamification: true }, gamification })});\n`,
    { parser: 'typescript', singleQuote: true },
  ),
);
