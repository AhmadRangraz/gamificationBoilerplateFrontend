import { expect, test } from '@playwright/test';

const healthPath = '/api/v1/health';

test('Nest checks the migrated PostgreSQL schema', async ({ request }) => {
  const response = await request.get(`http://127.0.0.1:4000${healthPath}`);
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toEqual({ status: 'ready', database: 'ready' });
});

test('Nest reports database unavailability without exposing connection details', async ({
  request,
}) => {
  const response = await request.get(`http://127.0.0.1:4001${healthPath}`);
  expect(response.status()).toBe(503);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toEqual({
    status: 'unavailable',
    database: 'unavailable',
  });
});

test('Next forwards the API through the web origin', async ({ request }) => {
  const response = await request.get(healthPath);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ready', database: 'ready' });
});

test('the Persian RTL dashboard renders real database readiness on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const response = await page.goto('/status');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(
    page.getByRole('heading', { name: 'نمای کلی سامانه' }),
  ).toBeVisible();
  await expect(
    page.locator('[data-service="PostgreSQL"] .status-badge'),
  ).toHaveText('آماده');
  await expect(
    page.getByRole('link', { name: 'مشاهدهٔ پاسخ سرویس' }),
  ).toHaveAttribute('href', healthPath);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});
