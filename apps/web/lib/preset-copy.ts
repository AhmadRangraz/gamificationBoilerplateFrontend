import type { ForgeConfig } from '@forge/config';

export const presetRoutes = {
  booking: {
    href: '/booking',
    label: 'رزرو خدمات',
    description: 'خدمت انتخاب کنید، وقت بگیرید یا نوبت‌های خود را مدیریت کنید.',
  },
  community: {
    href: '/community',
    label: 'انجمن',
    description: 'نوشته‌ای منتشر کنید و در گفت‌وگوی اعضا شرکت کنید.',
  },
  learning: {
    href: '/learning',
    label: 'آموزش',
    description: 'درس‌ها را بخوانید و پیشرفت دوره را ثبت کنید.',
  },
  assistant: {
    href: '/assistant',
    label: 'دستیار محلی',
    description:
      'گفت‌وگو را با پاسخ‌های آزمایشی فارسی و ذخیرهٔ تاریخچه امتحان کنید.',
  },
} as const;

export const presetCopy = {
  title: 'عنوان',
  description: 'توضیح',
  newService: 'افزودن خدمت',
  serviceTitle: 'عنوان خدمت',
  slot: 'زمان پیشنهادی در منطقهٔ زمانی دستگاه',
  addSlot: 'افزودن وقت',
  reserve: 'رزرو',
  appointments: 'نوبت‌های من',
  provider: 'ارائه‌دهنده',
  customer: 'مشتری',
  halfHour: '۳۰ دقیقه',
  noSlots: 'وقت آزاد برای این خدمت ثبت نشده است.',
  noServices: 'هنوز خدمتی ثبت نشده است.',
  noAppointments: 'هنوز نوبتی ثبت نشده است.',
  appointmentStates: {
    REQUESTED: 'درخواست‌شده',
    CONFIRMED: 'تأییدشده',
    CANCELLED: 'لغوشده',
    COMPLETED: 'انجام‌شده',
  },
  appointmentActions: {
    CONFIRMED: 'تأیید نوبت',
    CANCELLED: 'لغو نوبت',
    COMPLETED: 'ثبت انجام نوبت',
  },
  newPost: 'نوشتهٔ تازه',
  publish: 'انتشار',
  noPosts: 'هنوز نوشته‌ای ثبت نشده است.',
  comment: 'دیدگاه',
  addComment: 'ثبت دیدگاه',
  react: 'پسندیدن',
  removeReaction: 'برداشتن پسند',
  notifications: 'اعلان‌ها',
  socialNotice: {
    COMMENT: 'برای نوشتهٔ شما دیدگاه گذاشت.',
    REACTION: 'نوشتهٔ شما را پسندید.',
  },
  noCourses: 'هنوز دوره‌ای در دسترس نیست.',
  markLesson: 'ثبت پایان درس',
  completedLesson: 'درس تکمیل شد.',
  conversations: 'گفت‌وگوها',
  newConversation: 'گفت‌وگوی تازه',
  prompt: 'پیام',
  send: 'ارسال',
  processing: 'در حال دریافت پاسخ',
  mockPrompt: 'برای نمونه‌سازی یک برنامهٔ کوتاه پیشنهاد کن.',
  topic: 'موضوع پاسخ',
  topics: { planning: 'برنامه‌ریزی', learning: 'یادگیری', general: 'عمومی' },
  deleteConversation: 'حذف گفت‌وگو',
};

export function presetHome(
  template: ForgeConfig['template'],
  features: ForgeConfig['features'],
) {
  if (template === 'marketplace' && features.marketplace) return '/marketplace';
  const key = template === 'ai' ? 'assistant' : template;
  if (
    key === 'booking' ||
    key === 'community' ||
    key === 'learning' ||
    key === 'assistant'
  )
    return features[key] ? presetRoutes[key].href : undefined;
}
