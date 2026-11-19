import { forgeConfig } from '@forge/config';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../auth/session.js';
import type { PrismaService } from '../prisma.service.js';

const ownerId = 'a20972c0-401e-4afb-998e-a2cbef5b41d5';
const demoEmail = 'forge-demo-studio@example.test';

export async function seedPresets(db: PrismaService) {
  const { booking, community, learning, assistant } = forgeConfig.features;
  if (!booking && !community && !learning && !assistant) return;
  const passwordHash =
    booking || community || assistant
      ? await hashPassword(randomBytes(32).toString('hex'))
      : null;
  await db.$transaction(async (tx) => {
    if (passwordHash) {
      const owner = await tx.account.upsert({
        where: { id: ownerId },
        create: {
          id: ownerId,
          email: demoEmail,
          name: 'استودیو نارنج',
          passwordHash,
          emailVerified: true,
        },
        update: {},
        select: { email: true },
      });
      if (owner.email !== demoEmail)
        throw new Error('Reserved demo account already exists.');
    }
    if (booking) {
      const service = await tx.serviceOffering.upsert({
        where: { demoKey: 'demo-consultation' },
        create: {
          demoKey: 'demo-consultation',
          providerId: ownerId,
          title: 'مشاورهٔ طراحی',
          description: 'جلسهٔ سی دقیقه‌ای برای مرور نیازها و انتخاب مسیر طراحی.',
        },
        update: {},
        select: { id: true, providerId: true },
      });
      if (service.providerId !== ownerId)
        throw new Error('Reserved demo service already exists.');
      const date = new Date();
      date.setUTCHours(10, 0, 0, 0);
      await tx.serviceSlot.createMany({
        data: [1, 2, 3].map((day) => ({
          serviceId: service.id,
          startsAt: new Date(date.getTime() + day * 86400000),
        })),
        skipDuplicates: true,
      });
    }
    if (community)
      await tx.communityPost.createMany({
        data: [
          {
            demoKey: 'demo-welcome',
            authorId: ownerId,
            body: 'به انجمن فورج خوش آمدید. امروز روی چه چیزی کار می‌کنید؟',
          },
          {
            demoKey: 'demo-feedback',
            authorId: ownerId,
            body: 'یک تغییر کوچک از پروژه‌تان را به اشتراک بگذارید و از اعضا بازخورد بگیرید.',
          },
        ],
        skipDuplicates: true,
      });
    if (learning)
      await tx.course.upsert({
        where: { slug: 'demo-prototyping' },
        update: {},
        create: {
          slug: 'demo-prototyping',
          title: 'نمونه‌سازی محصول',
          description: 'یک مسیر کوتاه برای ساخت و آزمایش نمونهٔ اولیه.',
          lessons: {
            create: [
              {
                position: 1,
                title: 'تعریف مسئله',
                body: 'یک کاربر و یک نیاز مشخص انتخاب کنید. جملهٔ مسئله را با نتیجهٔ قابل مشاهده بنویسید.',
              },
              {
                position: 2,
                title: 'آزمایش نمونه',
                body: 'کوچک‌ترین مسیر کاربر را پیاده کنید. از یک نفر بخواهید بدون راهنمایی آن را امتحان کند و نتیجه را یادداشت کنید.',
              },
            ],
          },
        },
      });
    if (assistant)
      await tx.conversation.upsert({
        where: { id: '8cdc05da-75a8-46cf-b36d-799b218ea2bc' },
        update: {},
        create: {
          id: '8cdc05da-75a8-46cf-b36d-799b218ea2bc',
          accountId: ownerId,
          title: 'برنامهٔ نمونه‌سازی',
          turns: {
            create: {
              requestId: '32bcb927-82be-4cb0-9a5d-da2595fc6b3b',
              position: 0,
              prompt: 'برای نمونه‌سازی برنامه بده.',
              reply: 'هدف، مراحل و زمان آزمایش را مشخص کنید.',
              topic: 'planning',
            },
          },
        },
      });
  });
  console.log('Preset demo datasets ready.');
}
