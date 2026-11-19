export interface StructuredReply {
  reply: string;
  topic: 'planning' | 'learning' | 'general';
}

// Provider boundary. A future provider can implement this local interface.
export interface AssistantProvider {
  reply(
    prompt: string,
    previousTurns: number,
  ): StructuredReply | Promise<StructuredReply>;
}

export const localAssistant: AssistantProvider = {
  reply(prompt, previousTurns) {
    if (/برنامه|زمان|plan/iu.test(prompt)) {
      return {
        topic: 'planning',
        reply:
          'ابتدا نتیجهٔ مورد نظر را مشخص کنید. سپس کار را به سه مرحله تقسیم کنید و برای هر مرحله یک زمان و معیار پایان تعیین کنید.',
      };
    }
    if (/درس|یادگیری|learn/iu.test(prompt)) {
      return {
        topic: 'learning',
        reply:
          'یک مثال ساده انتخاب کنید، آن را توضیح دهید و با یک تمرین کوتاه نتیجه را بررسی کنید. نکته‌ای را که دشوار بود یادداشت کنید.',
      };
    }
    return {
      topic: 'general',
      reply: previousTurns
        ? 'برای ادامه، نزدیک‌ترین اقدام قابل آزمایش را انتخاب کنید و نتیجه را در همین گفت‌وگو ثبت کنید.'
        : 'برای شروع، مسئله را در یک جمله بیان کنید. ورودی‌ها، خروجی مورد انتظار و یک نمونهٔ کوچک را مشخص کنید.',
    };
  },
};
