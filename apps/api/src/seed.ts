import { randomBytes } from 'node:crypto';
import { forgeConfig } from '@forge/config';
import { hashPassword } from './auth/session.js';
import type { Prisma } from './generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';
import { seedPresets } from './presets/seed.js';

const sellerId = '88109c8d-2012-4a16-95ae-414242837ae0';
const sellerEmail = 'forge-demo-seller@example.test';

const listings = [
  {
    demoKey: 'demo-indigo-bowl',
    title: 'کاسهٔ سفالی لعاب لاجوردی',
    description:
      'کاسهٔ دست‌ساز کارگاه کاشان با لعاب لاجوردی. قطر دهانه ۱۸ سانتی‌متر است و برای سرو تنقلات مناسب است.',
    category: 'HANDMADE',
    price: 480_000,
  },
  {
    demoKey: 'demo-iran-architecture',
    title: 'کتاب معماری خانه‌های ایرانی',
    description:
      'نسخهٔ سالم و خوانده‌شده با تصاویر رنگی از خانه‌های تاریخی یزد، کاشان و شیراز.',
    category: 'BOOKS',
    price: 390_000,
  },
  {
    demoKey: 'demo-desk-lamp',
    title: 'چراغ مطالعهٔ شارژی',
    description:
      'چراغ رومیزی با سه درجه روشنایی و کابل شارژ. انتخاب مناسبی برای میز مطالعهٔ کوچک است.',
    category: 'ELECTRONICS',
    price: 1_190_000,
  },
] satisfies Omit<Prisma.ListingCreateManyInput, 'ownerId'>[];

async function seed() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Demo seeding is disabled in production.');
  try {
    process.loadEnvFile('../../.env');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const url = process.env.DATABASE_URL;
  if (
    !url ||
    !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
  ) {
    throw new Error('Demo seeding requires a local PostgreSQL connection.');
  }
  const db = new PrismaService();
  try {
    const { features } = forgeConfig;
    if (features.workspaceAdmin) {
      const result = await db.workspace.createMany({
        data: [
          { slug: 'demo-sepehr-studio', name: 'استودیو سپهر' },
          { slug: 'demo-narenj-workshop', name: 'کارگاه نارنج' },
          { slug: 'demo-hamrahan-team', name: 'تیم همراهان' },
        ],
        skipDuplicates: true,
      });
      console.log(`Workspace demo records inserted: ${result.count}`);
    }
    if (features.marketplace) {
      const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
      const count = await db.$transaction(async (tx) => {
        const seller = await tx.account.upsert({
          where: { id: sellerId },
          create: {
            id: sellerId,
            email: sellerEmail,
            name: 'کارگاه آبان',
            passwordHash,
            emailVerified: true,
          },
          update: {},
        });
        if (seller.email !== sellerEmail)
          throw new Error('The reserved demo seller ID is already in use.');
        return tx.listing.createMany({
          data: listings.map((listing) => ({ ...listing, ownerId: sellerId })),
          skipDuplicates: true,
        });
      });
      console.log(`Marketplace demo records inserted: ${count.count}`);
    }
    await seedPresets(db);
    if (
      !features.workspaceAdmin &&
      !features.marketplace &&
      !features.booking &&
      !features.community &&
      !features.learning &&
      !features.assistant
    )
      console.log('No demo datasets are enabled.');
  } finally {
    await db.$disconnect();
  }
}

void seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
