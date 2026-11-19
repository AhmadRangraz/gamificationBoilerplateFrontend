import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { ui } from '../apps/web/lib/account-copy';
import { dbClient, messagesFor } from './fixtures';

const origin = 'http://localhost:3000';
const password = 'safe example passphrase';

test('Persian account flows work with keyboard navigation and mock email on mobile', async ({
  page,
}) => {
  const email = `forge-ui-${randomUUID()}@example.test`;
  const db = await dbClient();
  try {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/login$/);
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'رفتن به محتوای اصلی' }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await page.getByRole('link', { name: ui.register }).click();
    await expect(
      page.getByRole('heading', { name: ui.register }),
    ).toBeVisible();
    await page.getByRole('button', { name: ui.register }).click();
    await expect(page.getByLabel(ui.name)).toBeFocused();
    await expect(page.getByText(ui.required, { exact: true })).toBeVisible();
    await page.getByLabel(ui.name).fill('نگار احمدی');
    await page.getByLabel(ui.email).fill(email);
    await page.getByLabel(ui.password).fill(password);
    await page.getByRole('button', { name: ui.register }).click();
    await expect(page.getByRole('heading', { name: ui.profile })).toBeVisible();
    await expect(page.getByRole('link', { name: ui.account })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);

    await page.getByLabel(ui.name).fill('نگار');
    await page.getByRole('button', { name: ui.save, exact: true }).click();
    await expect(page.getByText(ui.saved, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: ui.requestCode }).click();
    await expect(page.getByText(ui.verifyRequested)).toBeVisible();
    const verification = (await messagesFor(email)).find(
      (message) => message.kind === 'VERIFY_EMAIL',
    );
    await page.getByRole('link', { name: ui.haveCode }).click();
    await page.getByLabel(ui.code).fill(verification?.code ?? '');
    await page.getByRole('button', { name: ui.verify }).click();
    await expect(page.getByText(ui.verifyDone)).toBeVisible();
    await page.goto('/account');
    await expect(page.getByText(ui.emailVerified)).toBeVisible();
    await page.getByLabel(ui.chooseAvatar).setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWNQSXT7j4wZCAoAABUBFXk/gVOWAAAAAElFTkSuQmCC',
        'base64',
      ),
    });
    await page.getByRole('button', { name: ui.uploadAvatar }).click();
    await expect(page.getByRole('img', { name: ui.avatar })).toBeVisible();
    await page.getByRole('button', { name: ui.removeAvatar }).click();
    await expect(page.getByRole('img', { name: ui.avatar })).toBeHidden();

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/account$/);
    await page.getByRole('button', { name: ui.logout }).click();
    await expect(page.getByRole('heading', { name: ui.login })).toBeVisible();
    await page.getByRole('link', { name: ui.recover }).click();
    await expect(page).toHaveURL(/\/auth\/recover$/);
    await page.getByLabel(ui.email).fill(email);
    const [recovery] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === '/api/v1/auth/password/request',
      ),
      page.getByRole('button', { name: ui.recover }).click(),
    ]);
    expect(recovery.status()).toBe(204);
    await expect(page.getByText(ui.resetRequested)).toBeVisible();
    const reset = (await messagesFor(email)).find(
      (message) => message.kind === 'RESET_PASSWORD',
    );
    await page.getByRole('link', { name: ui.haveCode }).click();
    await page.getByLabel(ui.code).fill(reset?.code ?? '');
    const changed = `new passphrase ${randomUUID()}`;
    await page.getByLabel(ui.password).fill(changed);
    await page.getByRole('button', { name: ui.reset }).click();
    await expect(page.getByText(ui.resetDone)).toBeVisible();
    await page
      .getByRole('main')
      .getByRole('link', { name: ui.login, exact: true })
      .click();
    await page.getByLabel(ui.email).fill(email);
    await page.getByLabel(ui.password).fill(changed);
    await page.getByRole('button', { name: ui.login, exact: true }).click();
    await expect(page.getByRole('heading', { name: ui.profile })).toBeVisible();
  } finally {
    const account = await db.account.findUnique({ where: { email } });
    if (account)
      await db.accountAudit.deleteMany({ where: { accountId: account.id } });
    await db.account.deleteMany({ where: { email } });
    for (const message of await messagesFor(email))
      await rm(message.path, { force: true });
    await db.$disconnect();
  }
});

test(
  'administrator can manage workspaces and persist a theme',
  { tag: '@workspace-admin' },
  async ({ page }) => {
    const db = await dbClient();
    const email = `forge-admin-ui-${randomUUID()}@example.test`;
    const slug = `design-${randomUUID()}`;
    const memberEmail = `forge-member-ui-${randomUUID()}@example.test`;
    try {
      const register = await page.request.post(
        `${origin}/api/v1/auth/register`,
        {
          headers: { origin },
          data: { email, name: 'مدیر نمونه', password },
        },
      );
      expect(register.status()).toBe(201);
      const denied = await page.request.post(`${origin}/api/v1/workspaces`, {
        headers: { origin },
        data: { slug, name: 'غیرمجاز' },
      });
      expect(denied.status()).toBe(403);
      await db.account.update({ where: { email }, data: { role: 'ADMIN' } });
      await page.goto('/admin');
      await expect(page.getByRole('heading', { name: ui.admin })).toBeVisible();
      await page.getByLabel(ui.search).fill(email);
      await expect(
        page.getByRole('row').filter({ hasText: email }),
      ).toBeVisible();

      await page.getByLabel(ui.appearance).selectOption('dark');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.getByLabel(ui.appearance).selectOption('vibrant');
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        'vibrant',
      );
      await page.getByLabel(ui.appearance).selectOption('professional');
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        'professional',
      );

      await page.getByRole('link', { name: ui.workspaces }).click();
      await page.getByLabel(ui.name).fill('استودیو سپهر');
      await page.getByLabel(ui.slug).fill(slug);
      await page.getByRole('button', { name: ui.save, exact: true }).click();
      const row = page.getByRole('row').filter({ hasText: slug });
      await expect(row).toContainText('استودیو سپهر');
      await row.getByRole('button', { name: ui.edit }).click();
      await expect(page.getByLabel(ui.name)).toBeFocused();
      await page.getByLabel(ui.name).fill('استودیو سپهر نو');
      await page.getByRole('button', { name: ui.save, exact: true }).click();
      await expect(row).toContainText('استودیو سپهر نو');

      await row.getByRole('button', { name: ui.delete }).click();
      const dialog = page.getByRole('alertdialog');
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: ui.cancel }),
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(row.getByRole('button', { name: ui.delete })).toBeFocused();
      await row.getByRole('button', { name: ui.delete }).click();
      await dialog.getByRole('button', { name: ui.delete }).click();
      await expect(row).toHaveCount(0);
    } finally {
      await db.workspace.deleteMany({ where: { slug } });
      const accounts = await db.account.findMany({
        where: { email: { in: [email, memberEmail] } },
        select: { id: true },
      });
      const ids = accounts.map(({ id }) => id);
      await db.accountAudit.deleteMany({ where: { accountId: { in: ids } } });
      await db.account.deleteMany({ where: { id: { in: ids } } });
      await db.$disconnect();
    }
  },
);
