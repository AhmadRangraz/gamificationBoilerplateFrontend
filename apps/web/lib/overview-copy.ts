import type { ForgeConfig } from '@forge/config';
import { ui } from './account-copy';
import { market } from './market-copy';
import { presetRoutes } from './preset-copy';
import { progressCopy } from './progress-copy';

type Capability = {
  title: string;
  description: string;
  details: readonly string[];
  demo?: {
    href: string;
    label: string;
    feature?: keyof ForgeConfig['features'];
    admin?: boolean;
  };
};

export const overviewCopy = {
  title: 'با فورج، محصول فارسی خود را بسازید',
  description:
    'فورج یک زیرساخت آمادهٔ توسعه برای ساخت محصولات وب فارسی است. حساب کاربری، پنل مدیریت و تجربهٔ راست‌به‌چپ را از روز اول داشته باشید و امکانات فروش، رزرو، انجمن، آموزش و بازی‌وارسازی را به تناسب محصولتان فعال کنید.',
  browse: 'کشف امکانات',
  unavailable: 'در این پیکربندی غیرفعال است',
  administrator: 'ویژهٔ مدیران',
  groups: {
    engagement: {
      title: 'بازی‌وارسازی و باشگاه کاربران',
      description:
        'برای فعالیت‌های واقعی پاداش تعریف کنید و مسیر پیشرفت کاربر را از اولین اقدام تا چالش‌های گروهی طراحی کنید.',
    },
    products: {
      title: 'ماژول‌های آماده برای محصول شما',
      description:
        'ماژول‌ها از حساب کاربری، رابط فارسی و قرارداد API مشترک استفاده می‌کنند و می‌توانند کنار هم فعال باشند.',
    },
    foundation: {
      title: 'زیرساخت مشترک',
      description:
        'از ثبت‌نام تا استقرار، قابلیت‌هایی که در هر محصول به آن‌ها نیاز دارید از پیش آماده‌اند.',
    },
  },
};

export const overviewCapabilities = {
  progress: {
    title: 'امتیاز، تجربه و سطح',
    description:
      'فعالیت‌هایی مثل تکمیل درس یا انتشار آگهی را به پیشرفت قابل مشاهده تبدیل کنید.',
    details: [
      'تاریخچهٔ امتیاز و تجربه با سقف دریافت روزانه',
      'نشان‌های قابل‌تنظیم، تداوم فعالیت و محافظت از آن',
    ],
    demo: {
      href: '/progress',
      label: progressCopy.title,
      feature: 'gamification',
    },
  },
  campaigns: {
    title: 'مأموریت، چالش و معرفی دوستان',
    description: 'برای اولین تجربه و بازگشت کاربران هدف مشخص تعریف کنید.',
    details: [
      'مأموریت‌های یک‌باره، روزانه، هفتگی و چندمرحله‌ای',
      'چالش فردی و گروهی، هدف شخصی و پاداش معرفی تأییدشده',
    ],
    demo: {
      href: '/progress/engagement',
      label: 'چالش‌ها و معرفی دوستان',
      feature: 'gamification',
    },
  },
  rewards: {
    title: 'فروشگاه پاداش',
    description:
      'کاربر امتیازهایش را خرج می‌کند و رسید دریافت پاداش را می‌بیند.',
    details: [
      'قیمت قابل‌تنظیم و تخفیف بر اساس سطح',
      'ثبت دریافت پاداش در حساب کاربر با تحویل آزمایشی محلی',
    ],
    demo: {
      href: '/progress/rewards',
      label: 'مشاهدهٔ پاداش‌ها',
      feature: 'gamification',
    },
  },
  rankings: {
    title: 'رتبه‌بندی و فصل‌ها',
    description:
      'جدول رتبه‌بندی دوره‌ای بسازید و اختیار نمایش عمومی را به کاربر بدهید.',
    details: [
      'رتبه‌بندی هفتگی، ماهانه، کلی و فصلی',
      'مدیریت رتبه‌بندی، تحلیل فعالیت و تعدیل امتیاز با ثبت سوابق',
    ],
    demo: {
      href: '/progress/leaderboard',
      label: 'مشاهدهٔ رتبه‌بندی',
      feature: 'gamification',
    },
  },
  marketplace: {
    title: market.title,
    description:
      'یک بازار آگهی راه بیندازید که فروشنده بتواند آگهی خود را منتشر و مدیریت کند.',
    details: [
      'مرور آگهی‌های دسته‌بندی‌شده و نمایش قیمت به تومان',
      'صفحهٔ جزئیات، آگهی‌های من و علاقه‌مندی‌ها',
    ],
    demo: {
      href: '/marketplace',
      label: 'مرور آگهی‌ها',
      feature: 'marketplace',
    },
  },
  booking: {
    title: presetRoutes.booking.label,
    description: 'خدمت و زمان‌های آزاد تعریف کنید تا مشتری بتواند نوبت بگیرد.',
    details: [
      'زمان‌بندی، رزرو و مدیریت نوبت برای مشتری و ارائه‌دهنده',
      'تأیید، لغو، ثبت پایان و جلوگیری از رزرو هم‌زمان یک نوبت',
    ],
    demo: { href: '/booking', label: 'مشاهدهٔ خدمات', feature: 'booking' },
  },
  community: {
    title: presetRoutes.community.label,
    description: 'فضایی برای گفت‌وگو و مشارکت اعضای محصولتان فراهم کنید.',
    details: [
      'انتشار نوشته، ثبت دیدگاه و پسندیدن',
      'اعلان دیدگاه‌ها و واکنش‌ها برای نویسنده',
    ],
    demo: { href: '/community', label: 'ورود به انجمن', feature: 'community' },
  },
  learning: {
    title: presetRoutes.learning.label,
    description:
      'محتوای آموزشی را به دوره‌ها و درس‌های قابل پیگیری تبدیل کنید.',
    details: [
      'فهرست دوره‌ها و درس‌های مرتب‌شده',
      'ثبت تکمیل درس و امکان دریافت پاداش برای یادگیری',
    ],
    demo: { href: '/learning', label: 'مرور دوره‌ها', feature: 'learning' },
  },
  assistant: {
    title: presetRoutes.assistant.label,
    description:
      'رابط یک دستیار فارسی را با پاسخ آزمایشی و نمایش تدریجی متن امتحان کنید.',
    details: [
      'گفت‌وگوی تازه، تاریخچهٔ خصوصی و حذف مکالمه',
      'پاسخ‌های آزمایشی محلی برای برنامه‌ریزی، یادگیری و پرسش‌های عمومی',
    ],
    demo: { href: '/assistant', label: 'آزمایش دستیار', feature: 'assistant' },
  },
  accounts: {
    title: 'حساب کاربری و هویت',
    description:
      'ثبت‌نام، ورود و مدیریت حساب را با فرم‌های فارسی در اختیار کاربران بگذارید.',
    details: [
      'ویرایش نمایه، تصویر حساب، تأیید ایمیل و بازیابی گذرواژه',
      'نشست‌های قابل لغو و مجوزهای جداگانه برای اعضا و مدیران',
    ],
    demo: { href: '/account', label: ui.account },
  },
  workspaces: {
    title: 'پنل مدیریت',
    description:
      'حساب‌ها و فضای کاری محصول را از یک پنل راست‌به‌چپ مدیریت کنید.',
    details: [
      'مدیریت و تعلیق حساب‌ها همراه با ثبت اقدامات حساس',
      'ایجاد، ویرایش و حذف فضاهای کاری در ماژول مدیریت',
    ],
    demo: {
      href: '/admin/workspaces',
      label: ui.workspaces,
      feature: 'workspaceAdmin',
      admin: true,
    },
  },
  experience: {
    title: 'تجربهٔ فارسی برای وب و موبایل',
    description:
      'رابط واکنش‌گرا با چیدمان راست‌به‌چپ، تاریخ جلالی و اعداد قابل‌تنظیم.',
    details: [
      'سه پوستهٔ حرفه‌ای، تیره و رنگی',
      'وب‌اپ نصب‌شدنی با صفحهٔ آفلاین در صورت فعال بودن PWA',
    ],
  },
  platform: {
    title: 'ابزارهای توسعه و استقرار',
    description:
      'رابط Next.js، سرویس NestJS و داده‌های PostgreSQL با Prisma در یک فضای کاری TypeScript.',
    details: [
      'قرارداد OpenAPI، کلاینت تایپ‌شده و Swagger محلی',
      'فعال‌سازی ماژول‌ها و تنظیم قوانین در forge.config.ts',
      'خط فرمان ساخت پروژه، دادهٔ نمونه، آزمون مرورگر و بررسی سلامت سرویس‌ها',
      'پشتیبان‌گیری و آزمایش بازیابی پایگاه داده با ابزارهای محلی',
    ],
    demo: { href: '/status', label: 'مشاهدهٔ وضعیت سرویس‌ها' },
  },
} satisfies Record<string, Capability>;

export type OverviewCapability = Capability;
