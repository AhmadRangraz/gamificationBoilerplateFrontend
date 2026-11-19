import { forgeConfig, type ForgeConfig } from '@forge/config';

function localeOptions(digits: ForgeConfig['digits']) {
  return { numberingSystem: digits === 'persian' ? 'arabext' : 'latn' };
}

export function formatNumber(
  value: number,
  digits = forgeConfig.digits,
): string {
  return new Intl.NumberFormat(
    forgeConfig.locale,
    localeOptions(digits),
  ).format(value);
}

export function formatJalaliDate(value: Date, config = forgeConfig): string {
  return new Intl.DateTimeFormat(config.locale, {
    ...localeOptions(config.digits),
    calendar: 'persian',
    timeZone: config.timezone,
    dateStyle: 'long',
  }).format(value);
}
