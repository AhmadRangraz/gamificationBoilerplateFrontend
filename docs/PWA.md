# PWA

All six presets use the same manifest, install icons, and Persian offline screen. The service worker registers on production builds in a secure context. Use HTTPS for a deployed app or localhost for local testing.

## Configuration

Add or edit the `pwa` object in `forge.config.ts`.

```ts
pwa: {
  enabled: true,
  shortName: 'فورج',
  themeColor: '#246146',
  backgroundColor: '#f5f7f3',
  revision: 'release-1',
},
```

The manifest uses the project name, description, and locale. The PWA options control the short label, browser theme color, and splash background where the browser supports them. The start URL is the project root, which opens the dashboard in SaaS and redirects to the catalog in Marketplace. Replace the PNG files under `apps/web/public/pwa/` to rebrand the icons. Keep the 192 px, 512 px, maskable 512 px, and Apple 180 px sizes.

Increase `revision` when deploying a new app release or updating icon bytes. Changes to the offline document or worker implementation also change the worker's cache version. A waiting worker displays a Persian update button. Accepting the update activates it, removes old Forge caches and reloads the tab. Keep the `/sw.js` response uncached at the reverse proxy.

To disable a deployment, set `enabled: false` and rebuild. New pages omit install metadata. The worker endpoint then serves a retirement script that removes its own caches and unregisters when existing installations update.

## Offline boundaries

The service worker pre-caches the offline document and the four local icons with credentials omitted. Document navigation stays network-first. A network failure on an app document shows the standalone Persian fallback. Authenticated pages, API responses, React Server Component requests, and mutations stay outside the service worker cache. Writes require a live connection. Web push and background synchronization are planned capabilities.

## Verify locally

Run `pnpm setup` and `pnpm build`. In separate terminals start `pnpm --filter @forge/api start` and `pnpm --filter @forge/web start`. Open the app on port 3000 in a normal browser profile. Use the in-app install button when the browser exposes an install prompt, or use the browser's install menu. On iOS Safari, use Share → Add to Home Screen. Browser menus and eligibility checks vary by platform.

Use the automated check on an installed checkout with PostgreSQL running.

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm test:e2e tests/pwa.spec.ts
```

The default Chromium test validates installability in a disposable profile, mocks the browser prompt event to check the app button, and tests a real service worker update and offline behavior. With an available display and a browser profile that permits native installation, run the install and launch check with `FORGE_E2E_HEADED_INSTALL=1` and `--grep 'disposable profile'`. In the managed cloud Chromium, `WebAppInstallByUserEnabled=false` blocks native installation and the protocol returns `kWebAppDisabled`. Native installation remains unverified there.

The hosted `native-pwa` matrix job generated a SaaS checkout and passed native install, launch, and uninstall on headed Chromium under Xvfb at M9 commit `ed71145`. [Native PWA job](https://github.com/AhmadRangraz/gamificationBoilerplateFrontend/actions/runs/44595264192/job/135811725460)
