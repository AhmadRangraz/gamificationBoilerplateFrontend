import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ui } from '../apps/web/lib/account-copy';

test('login passes automated accessibility checks in each theme on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: ui.login })).toBeVisible();
  for (const theme of ['professional', 'dark', 'vibrant']) {
    await page.getByLabel(ui.appearance).selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map(({ target }) => target),
      })),
    ).toEqual([]);
  }
});
