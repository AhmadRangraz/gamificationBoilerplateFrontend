import { forgeConfig } from '@forge/config';
import { expect, test } from 'vitest';
import { formatJalaliDate, formatNumber } from './index';

test('formats numbers with selected digits', () => {
  expect(formatNumber(1250, 'persian')).toBe('۱٬۲۵۰');
  expect(formatNumber(1250, 'latin')).toBe('1,250');
});

test('formats the Jalali new year using the configured timezone', () => {
  const instant = new Date('2025-03-20T21:00:00Z');
  expect(formatJalaliDate(instant)).toBe('۱ فروردین ۱۴۰۴');
  expect(
    formatJalaliDate(instant, {
      ...forgeConfig,
      timezone: 'UTC',
      digits: 'latin',
    }),
  ).toBe('30 اسفند 1403');
});
