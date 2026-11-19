import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { expect, test, type Page } from '@playwright/test';
import forgeConfig from '../forge.config';
import { ui } from '../apps/web/lib/account-copy';
import { fa } from '../apps/web/lib/copy';
import { pwaAssets } from '../apps/web/lib/pwa-assets';
import { pwaCopy } from '../apps/web/lib/pwa-copy';
import { dbClient } from './fixtures';

async function waitForControl(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test(
  'Chromium validates PWA installability in a disposable profile',
  { tag: '@pwa-enabled' },
  async ({ playwright, request }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.headers()['content-type']).toContain(
      'application/manifest+json',
    );
    expect(await manifest.json()).toMatchObject({
      name: forgeConfig.project.name,
      short_name: forgeConfig.pwa.shortName ?? forgeConfig.project.name,
      lang: 'fa-IR',
      dir: 'rtl',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: forgeConfig.pwa.themeColor,
      icons: expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
      ]),
    });
    const script = await request.get('/sw.js');
    expect(script.headers()['cache-control']).toContain('no-store');
    expect(script.headers()['service-worker-allowed']).toBe('/');

    const profile = await mkdtemp(join(tmpdir(), 'forge-pwa-profile-'));
    try {
      const headed = process.env.FORGE_E2E_HEADED_INSTALL === '1';
      const context = await playwright.chromium.launchPersistentContext(
        join(profile, 'browser'),
        {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
          headless: !headed,
          env: {
            ...process.env,
            XDG_CACHE_HOME: join(profile, 'cache'),
            XDG_CONFIG_HOME: join(profile, 'config'),
            XDG_DATA_HOME: join(profile, 'data'),
          },
        },
      );
      try {
        const page = context.pages()[0] ?? (await context.newPage());
        await page.goto('http://localhost:3000/');
        await waitForControl(page);
        await expect(page.locator('link[rel=manifest]')).toHaveAttribute(
          'href',
          '/manifest.webmanifest',
        );
        await expect(
          page.locator('link[rel=apple-touch-icon]'),
        ).toHaveAttribute('href', pwaAssets.apple);
        const sizes = await page.evaluate(
          async (paths) => {
            return Promise.all(
              paths.map(async (path) => {
                const response = await fetch(path);
                const image = await createImageBitmap(await response.blob());
                const result = [image.width, image.height];
                image.close();
                return result;
              }),
            );
          },
          [
            pwaAssets.icon192,
            pwaAssets.icon512,
            pwaAssets.maskable,
            pwaAssets.apple,
          ],
        );
        expect(sizes).toEqual([
          [192, 192],
          [512, 512],
          [512, 512],
          [180, 180],
        ]);

        const cdp = await context.newCDPSession(page);
        await cdp.send('Page.enable');
        const result = await cdp.send('Page.getInstallabilityErrors');
        expect(result.installabilityErrors).toEqual([]);

        if (!headed) {
          await page.evaluate(() => {
            const prompt = Object.assign(
              new Event('beforeinstallprompt', { cancelable: true }),
              {
                prompt: async () =>
                  sessionStorage.setItem('forge-install-prompt', 'shown'),
                userChoice: Promise.resolve({ outcome: 'dismissed' }),
              },
            );
            window.dispatchEvent(prompt);
          });
          await page.getByRole('button', { name: pwaCopy.install }).click();
          expect(
            await page.evaluate(() =>
              sessionStorage.getItem('forge-install-prompt'),
            ),
          ).toBe('shown');
          await expect(
            page.getByRole('button', { name: pwaCopy.install }),
          ).toHaveCount(0);
          return;
        }
        const manifestId = 'http://localhost:3000/';
        await cdp.send('PWA.install', { manifestId });
        try {
          const launched = await cdp.send('PWA.launch', { manifestId });
          expect(launched.targetId).toBeTruthy();
        } finally {
          await cdp.send('PWA.uninstall', { manifestId });
        }
      } finally {
        await context.close();
      }
    } finally {
      await rm(profile, { recursive: true, force: true });
    }
  },
);

test(
  'offline navigation shows the Persian fallback and never stores account data or API responses',
  { tag: '@pwa-enabled' },
  async ({ page, context }) => {
    const email = `forge-offline-${randomUUID()}@example.test`;
    const name = 'دارندهٔ حساب آزمایشی';
    const db = await dbClient();
    try {
      const created = await page.request.post('/api/v1/auth/register', {
        headers: { origin: 'http://localhost:3000' },
        data: { name, email, password: randomUUID() },
      });
      expect(created.status()).toBe(201);
      await page.goto('/account');
      await expect(
        page.getByRole('heading', { name: ui.profile }),
      ).toBeVisible();
      await waitForControl(page);
      await page.reload();
      await expect(
        page.getByRole('heading', { name: ui.profile }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          async () => (await (await fetch('/api/v1/auth/me')).json()).name,
        ),
      ).toBe(name);
      const cached = await page.evaluate(async () => {
        const names = (await caches.keys()).filter((key) =>
          key.startsWith('forge-pwa-'),
        );
        const entries = await Promise.all(
          names.map(async (key) =>
            (await (await caches.open(key)).keys()).map(
              ({ url }) => new URL(url).pathname,
            ),
          ),
        );
        return entries.flat().sort();
      });
      expect(cached).toEqual(Object.values(pwaAssets).sort());

      await context.setOffline(true);
      const apiWorked = await page.evaluate(async () =>
        fetch('/api/v1/auth/me').then(
          () => true,
          () => false,
        ),
      );
      const writeWorked = await page.evaluate(async () =>
        fetch('/api/v1/auth/logout', { method: 'POST' }).then(
          () => true,
          () => false,
        ),
      );
      expect(apiWorked).toBe(false);
      expect(writeWorked).toBe(false);

      const offline = await page.goto('/account');
      expect(offline?.status()).toBe(503);
      await expect(
        page.getByRole('heading', { name: pwaCopy.offlineTitle }),
      ).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByText(email)).toHaveCount(0);
      await expect(page.getByText(name)).toHaveCount(0);

      await context.setOffline(false);
      await page.getByRole('link', { name: pwaCopy.retry }).click();
      await expect(
        page.getByRole('heading', { name: ui.profile }),
      ).toBeVisible();
      await page.goto('/status');
      await expect(
        page.getByRole('heading', { name: fa.heroTitle }),
      ).toBeVisible();
    } finally {
      await context.setOffline(false);
      const account = await db.account.findUnique({ where: { email } });
      if (account)
        await db.accountAudit.deleteMany({ where: { accountId: account.id } });
      await db.account.deleteMany({ where: { email } });
      await db.$disconnect();
    }
  },
);

test(
  'a waiting worker activates after confirmation and reloads the tab',
  { tag: '@pwa-enabled' },
  async ({ page }) => {
    let replacementRequests = 0;
    const server = createServer(async (request, response) => {
      const path = request.url ?? '/';
      if (!path.startsWith('/') || path.startsWith('//')) {
        response.writeHead(400).end();
        return;
      }
      try {
        const upstream = await fetch(new URL(path, 'http://localhost:3000'), {
          redirect: 'manual',
        });
        const headers = Object.fromEntries(upstream.headers.entries());
        for (const key of [
          'content-encoding',
          'content-length',
          'transfer-encoding',
          'connection',
        ])
          delete headers[key];
        if (path === '/sw.js?release=2') {
          replacementRequests++;
          delete headers.etag;
          const worker = (await upstream.text()).replace(
            /const CACHE = PREFIX \+ '[a-f0-9]+';/,
            "const CACHE = PREFIX + 'playwright-update';",
          );
          response.writeHead(upstream.status, headers).end(worker);
        } else {
          response
            .writeHead(upstream.status, headers)
            .end(Buffer.from(await upstream.arrayBuffer()));
        }
      } catch {
        response.writeHead(502).end();
      }
    });
    server.listen(0, '127.0.0.1');
    try {
      await once(server, 'listening');
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('Missing fixture port');
      await page.addInitScript(() => {
        // Keep the fixture on the same script URL after the app reloads.
        if (sessionStorage.getItem('forge-release') === '2') {
          const manager = navigator.serviceWorker;
          const register = manager.register.bind(manager);
          manager.register = (script, options) =>
            register(
              script === '/sw.js' ? '/sw.js?release=2' : script,
              options,
            );
        }
        sessionStorage.setItem(
          'forge-loads',
          String(Number(sessionStorage.getItem('forge-loads') ?? '0') + 1),
        );
      });
      const scopeURL = `http://127.0.0.1:${address.port}/`;
      await page.goto(new URL('status', scopeURL).href);
      await waitForControl(page);
      await page.evaluate(async () => {
        await caches.open('unrelated-test-cache');
      });
      await page.waitForFunction(async () => {
        const registration = await navigator.serviceWorker.ready;
        return (
          registration.active?.state === 'activated' && !registration.installing
        );
      });
      await page.evaluate(() => {
        sessionStorage.setItem('forge-release', '2');
        return navigator.serviceWorker
          .register('/sw.js?release=2', {
            scope: '/',
            updateViaCache: 'none',
          })
          .then(() => undefined);
      });
      await expect.poll(() => replacementRequests).toBeGreaterThan(0);
      await expect(page.getByText(pwaCopy.updateAvailable)).toBeVisible();
      expect(
        await page.evaluate(() => sessionStorage.getItem('forge-loads')),
      ).toBe('1');
      await Promise.all([
        page.waitForEvent('load'),
        page.getByRole('button', { name: pwaCopy.update, exact: true }).click(),
      ]);
      await expect
        .poll(() => page.evaluate(() => sessionStorage.getItem('forge-loads')))
        .toBe('2');
      await expect
        .poll(() => page.evaluate(() => caches.keys()))
        .toEqual(['unrelated-test-cache', 'forge-pwa-playwright-update']);
      await expect(page.getByText(pwaCopy.updateAvailable)).toHaveCount(0);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);

test(
  'turning PWA off removes install metadata and provides a retirement worker',
  { tag: '@pwa-disabled' },
  async ({ page, request }) => {
    expect((await request.get('/manifest.webmanifest')).status()).toBe(404);
    expect((await request.get('/pwa/offline')).status()).toBe(404);
    const script = await request.get('/sw.js');
    expect(await script.text()).toContain('self.registration.unregister()');
    await page.goto('/');
    await expect(page.locator('link[rel=manifest]')).toHaveCount(0);
    expect(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    ).toBe(0);
  },
);
