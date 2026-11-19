import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import forgeConfig from './forge.config';

process.env.FORGE_TEST_MAIL_DIR ??= mkdtempSync(
  join(tmpdir(), 'forge-test-mail-'),
);

const api = 'http://127.0.0.1:4000';
const web = 'http://localhost:3000';

export default defineConfig({
  testDir: 'tests',
  grepInvert: [
    forgeConfig.features.gamification
      ? /@gamification-disabled/
      : /@gamification-enabled/,
    ...(!forgeConfig.gamification.rules.emailVerified ? [/@email-points/] : []),
    ...(!forgeConfig.features.marketplace ||
    !forgeConfig.gamification.rules.listingPublished
      ? [/@listing-points/]
      : []),
    forgeConfig.pwa.enabled ? /@pwa-disabled/ : /@pwa-enabled/,
    forgeConfig.features.marketplace
      ? /@marketplace-disabled/
      : /@marketplace-enabled/,
    ...(!forgeConfig.features.workspaceAdmin ? [/@workspace-admin/] : []),
  ],
  workers: 2,
  fullyParallel: true,
  use: {
    baseURL: web,
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @forge/api start',
      url: `${api}/api/v1/health`,
      env: {
        FORGE_MAIL_MODE: 'mock',
        FORGE_MOCK_MAIL_DIR: process.env.FORGE_TEST_MAIL_DIR,
      },
      timeout: 30_000,
    },
    {
      command: 'pnpm --filter @forge/api start',
      port: 4001,
      env: {
        API_PORT: '4001',
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://forge.example.test',
        FORGE_MAIL_MODE: 'mock',
        DATABASE_URL: 'postgresql://forge@127.0.0.1:1/forge',
      },
      timeout: 30_000,
    },
    { command: 'pnpm --filter @forge/web start', url: web, timeout: 30_000 },
  ],
});
