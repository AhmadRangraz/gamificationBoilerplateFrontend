import 'server-only';
import { createForgeClient, type components } from '@forge/api-client';
import { forgeConfig, resolveApiOrigin } from '@forge/config';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export type Account = components['schemas']['AccountResponse'];

export async function serverApi() {
  const store = await cookies();
  const session =
    store.get('__Host-forge_session') ?? store.get('forge_session');
  return {
    session,
    api: createForgeClient(
      resolveApiOrigin(forgeConfig, process.env.FORGE_API_ORIGIN),
    ),
  };
}

export const readAccount = cache(async (): Promise<Account | null> => {
  const { session, api } = await serverApi();
  if (!session) return null;

  try {
    const { data } = await api.GET('/api/v1/auth/me', {
      headers: { cookie: `${session.name}=${session.value}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });
    return data ?? null;
  } catch {
    return null;
  }
});

export async function requireAccount(admin = false) {
  const account = await readAccount();
  if (!account) redirect('/auth/login');
  if (admin && account.role !== 'ADMIN') redirect('/account');
  return account;
}

export async function authorizedClient() {
  const { session, api } = await serverApi();
  if (!session) redirect('/auth/login');
  return {
    api,
    options: {
      headers: { cookie: `${session.name}=${session.value}` },
      cache: 'no-store' as const,
      signal: AbortSignal.timeout(3500),
    },
  };
}

export async function listAccounts(): Promise<Account[]> {
  const { api, options } = await authorizedClient();
  const { data, response } = await api.GET('/api/v1/auth/accounts', options);
  if (response.status === 401) redirect('/auth/login');
  if (response.status === 403) redirect('/account');
  if (!data) throw new Error('Unable to load accounts');
  return data;
}

export async function listWorkspaces(page: number) {
  const { api, options } = await authorizedClient();
  const { data, response } = await api.GET('/api/v1/workspaces', {
    ...options,
    params: { query: { page } },
  });
  if (response.status === 401) redirect('/auth/login');
  if (response.status === 403) redirect('/account');
  if (!data) throw new Error('Unable to load workspaces');
  return data;
}
