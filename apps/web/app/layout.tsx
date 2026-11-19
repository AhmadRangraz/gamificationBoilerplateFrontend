import '@fontsource-variable/vazirmatn';
import './globals.css';
import { forgeConfig } from '@forge/config';
import { cookies } from 'next/headers';
import { Logout, Navigation, ThemePicker } from '../components/navigation';
import { readAccount } from '../lib/accounts';
import { ui } from '../lib/account-copy';
import type { Metadata, Viewport } from 'next';
import { PwaControls } from '../components/pwa-controls';
import { pwaAssets } from '../lib/pwa-assets';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { fa } from '../lib/copy';

export const metadata: Metadata = {
  title: forgeConfig.project.name,
  description: forgeConfig.project.description,
  ...(forgeConfig.pwa.enabled
    ? {
        manifest: '/manifest.webmanifest',
        appleWebApp: {
          capable: true,
          title: forgeConfig.pwa.shortName ?? forgeConfig.project.name,
        },
        icons: {
          apple: [
            { url: pwaAssets.apple, sizes: '180x180', type: 'image/png' },
          ],
        },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: forgeConfig.pwa.enabled ? forgeConfig.pwa.themeColor : undefined,
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const store = await cookies();
  const saved = store.get('forge_theme')?.value;
  const theme =
    saved && Object.hasOwn(ui.themes, saved)
      ? (saved as keyof typeof ui.themes)
      : forgeConfig.theme;
  const account = await readAccount();
  return (
    <html lang={forgeConfig.locale} dir="rtl" data-theme={theme}>
      <body>
        <a className="skip-link" href="#main">
          {fa.skipToMain}
        </a>
        <div className="shell">
          <aside className="sidebar">
            <Link
              className="brand"
              href="/"
              aria-label={forgeConfig.project.name}
            >
              <span className="brand-mark" aria-hidden="true">
                {forgeConfig.project.symbol}
              </span>
              <span>
                <strong>{forgeConfig.project.name}</strong>
                <small>{fa.workspace}</small>
              </span>
            </Link>
          </aside>
          <Navigation
            role={account?.role ?? null}
            showFlow={forgeConfig.navigation.showStatusShortcut}
            template={forgeConfig.template}
            features={forgeConfig.features}
          />
          <div className="work-area">
            <header className="topbar">
              <Link className="mobile-brand" href="/">
                {forgeConfig.project.name}
              </Link>
              {account && (
                <span className="topbar-label">
                  <bdi>{account.name}</bdi>
                </span>
              )}
              <div className="topbar-actions">
                <ThemePicker initial={theme} />
                {account && <Logout />}
              </div>
            </header>
            <main id="main" tabIndex={-1} className="content">
              <PwaControls enabled={forgeConfig.pwa.enabled} />
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
