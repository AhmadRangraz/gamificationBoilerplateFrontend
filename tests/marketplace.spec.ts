import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { ui } from '../apps/web/lib/account-copy';
import { fa } from '../apps/web/lib/copy';
import { market } from '../apps/web/lib/market-copy';
import { dbClient } from './fixtures';
import forgeConfig from '../forge.config';

const origin = 'http://localhost:3000';
const headers = { origin };
const path = '/api/v1/marketplace';

async function register(
  request: APIRequestContext,
  email: string,
  name: string,
) {
  const response = await request.post(`${origin}/api/v1/auth/register`, {
    headers,
    data: { email, name, password: randomUUID() },
  });
  expect(response.status()).toBe(201);
}

test(
  'SaaS hides marketplace routes and navigation by default',
  { tag: '@marketplace-disabled' },
  async ({ page, request }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: market.title })).toHaveCount(0);
    expect((await page.goto('/marketplace'))?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: fa.missingTitle }),
    ).toBeVisible();
    expect((await request.get(`${path}/listings`)).status()).toBe(404);
  },
);

test(
  'Marketplace supports publishing, filters, details, favorites and owner-only edits',
  { tag: '@marketplace-enabled' },
  async ({ page, browser }) => {
    const db = await dbClient();
    const seller = `forge-market-seller-${randomUUID()}@example.test`;
    const buyer = `forge-market-buyer-${randomUUID()}@example.test`;
    const context = await browser.newContext({
      viewport: { width: 360, height: 780 },
    });
    const customer = await context.newPage();
    const title = `کتاب سفرنامه ${randomUUID().slice(0, 6)}`;
    try {
      await customer.goto(origin);
      if (forgeConfig.template === 'saas') {
        await customer
          .getByRole('navigation', { name: fa.navigation })
          .getByRole('link', { name: market.title })
          .click();
      }
      await expect(customer).toHaveURL(/\/marketplace$/);
      await expect(
        customer.getByRole('heading', { name: market.title }),
      ).toBeVisible();
      await register(page.request, seller, 'بازار آبان');
      await page.goto('/marketplace/mine');
      await page.getByLabel(market.titleField).fill(title);
      await page
        .getByLabel(market.descriptionField)
        .fill('نسخهٔ سالم با جلد کاغذی برای مطالعهٔ سفر.');
      await page.getByLabel(market.category).selectOption('BOOKS');
      await page.getByLabel(market.price).fill('۴۲۰۰۰۰');
      await page.getByRole('button', { name: ui.save, exact: true }).click();
      const ownerLink = page.getByRole('link', { name: title });
      await expect(ownerLink).toBeVisible();
      const detail = (await ownerLink.getAttribute('href'))!;
      const id = detail.split('/').at(-1)!;

      await customer.getByLabel(market.search).fill(title);
      await customer.getByLabel(market.category).selectOption('BOOKS');
      await customer.getByRole('button', { name: market.filter }).click();
      await expect(customer.getByRole('link', { name: title })).toBeVisible();
      expect(
        await customer.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(360);
      await customer.getByRole('link', { name: title }).click();
      await expect(
        customer.getByRole('heading', { name: title }),
      ).toBeVisible();
      await expect(customer.getByText('۴۲۰٬۰۰۰ تومان')).toBeVisible();
      await expect(
        customer.getByRole('link', { name: market.loginToSave }),
      ).toBeVisible();
      await register(customer.request, buyer, 'مشتری نمونه');

      const foreign = await customer.request.patch(
        `${origin}${path}/listings/${id}`,
        {
          headers,
          data: {
            title: 'تغییر غیرمجاز',
            description: 'نمونه',
            category: 'BOOKS',
            price: 1000,
          },
        },
      );
      expect(foreign.status()).toBe(404);
      expect(
        (
          await customer.request.delete(`${origin}${path}/listings/${id}`, {
            headers,
          })
        ).status(),
      ).toBe(404);
      await customer.reload();
      await customer.getByRole('button', { name: market.saveFavorite }).click();
      await expect(
        customer.getByRole('button', { name: market.removeFavorite }),
      ).toBeVisible();
      expect(
        (
          await customer.request.put(`${origin}${path}/favorites/${id}`, {
            headers,
          })
        ).status(),
      ).toBe(204);
      expect(await db.favorite.count({ where: { listingId: id } })).toBe(1);
      await customer.getByRole('link', { name: market.favorites }).click();
      await expect(customer.getByRole('link', { name: title })).toBeVisible();
      await customer.getByRole('link', { name: title }).click();
      await customer
        .getByRole('button', { name: market.removeFavorite })
        .click();
      await expect(
        customer.getByRole('button', { name: market.saveFavorite }),
      ).toBeVisible();

      await page.getByRole('button', { name: market.edit }).click();
      await page.getByLabel(market.titleField).fill(`${title} نو`);
      await page.getByRole('button', { name: ui.save, exact: true }).click();
      await expect(
        page.getByRole('link', { name: `${title} نو` }),
      ).toBeVisible();
      await page.getByRole('button', { name: ui.delete }).click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: ui.delete })
        .click();
      await expect(page.getByRole('link', { name: `${title} نو` })).toHaveCount(
        0,
      );
      expect(
        (
          await customer.request.get(`${origin}${path}/listings/${id}`)
        ).status(),
      ).toBe(404);
    } finally {
      await context.close();
      const accounts = await db.account.findMany({
        where: { email: { in: [buyer, seller] } },
        select: { id: true },
      });
      const ids = accounts.map(({ id }) => id);
      await db.accountAudit.deleteMany({ where: { accountId: { in: ids } } });
      await db.account.deleteMany({ where: { id: { in: ids } } });
      await db.$disconnect();
    }
  },
);
