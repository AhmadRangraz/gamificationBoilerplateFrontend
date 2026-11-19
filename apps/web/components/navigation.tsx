'use client';

import type { ForgeConfig } from '@forge/config';
import { Button, Notice } from '@forge/ui';
import {
  BriefcaseBusiness,
  GitBranch,
  LayoutDashboard,
  LogIn,
  LogOut,
  UsersRound,
  Store,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ui } from '../lib/account-copy';
import { browserApi, runMutation } from '../lib/browser-api';
import { fa } from '../lib/copy';
import { market } from '../lib/market-copy';
import { presetHome, presetRoutes } from '../lib/preset-copy';

type Role = 'MEMBER' | 'ADMIN' | null;
type Theme = ForgeConfig['theme'];

export function Navigation({
  role,
  showFlow,
  template,
  features,
}: {
  role: Role;
  showFlow: boolean;
  template: ForgeConfig['template'];
  features: ForgeConfig['features'];
}) {
  const pathname = usePathname();
  const overview = presetHome(template, features) ? '/status' : '/';
  const links = [
    ...(features.marketplace
      ? [{ href: '/marketplace', label: market.title, icon: Store }]
      : []),
    ...Object.entries(presetRoutes)
      .filter(([key]) => features[key as keyof typeof presetRoutes])
      .map(([, route]) => ({ ...route, icon: BriefcaseBusiness })),
    { href: overview, label: fa.overview, icon: LayoutDashboard },
    ...(showFlow
      ? [
          {
            href: `${overview}#flow`,
            label: fa.flow,
            icon: GitBranch,
            desktop: true,
          },
        ]
      : []),
    role
      ? { href: '/account', label: ui.account, icon: UserRound }
      : { href: '/auth/login', label: ui.login, icon: LogIn },
    ...(role === 'ADMIN'
      ? [
          { href: '/admin', label: ui.admin, icon: UsersRound },
          ...(features.workspaceAdmin
            ? [
                {
                  href: '/admin/workspaces',
                  label: ui.workspaces,
                  icon: BriefcaseBusiness,
                },
              ]
            : []),
        ]
      : []),
  ];
  return (
    <nav className="navigation" aria-label={fa.navigation}>
      {links.map(({ href, label, icon: Icon, ...options }) => (
        <Link
          key={href}
          href={href}
          className={'desktop' in options ? 'desktop-link' : undefined}
          aria-current={
            pathname === href ||
            (href !== '/' && pathname.startsWith(`${href}/`))
              ? 'page'
              : undefined
          }
        >
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function ThemePicker({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState(initial);
  function select(value: string) {
    if (!Object.hasOwn(ui.themes, value)) return;
    const next = value as Theme;
    document.documentElement.dataset.theme = next;
    document.cookie = `forge_theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    setTheme(next);
  }
  return (
    <label className="theme-picker">
      <span className="sr-only">{ui.appearance}</span>
      <select value={theme} onChange={(event) => select(event.target.value)}>
        {Object.entries(ui.themes).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Logout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function logout() {
    setBusy(true);
    setError(undefined);
    const failure = await runMutation(() =>
      browserApi().POST('/api/v1/auth/logout'),
    );
    if (failure) setError(failure);
    else {
      router.replace('/auth/login');
      router.refresh();
    }
    setBusy(false);
  }
  return (
    <div className="logout">
      <Button tone="quiet" onClick={logout} disabled={busy}>
        <LogOut size={16} aria-hidden="true" />
        {ui.logout}
      </Button>
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
