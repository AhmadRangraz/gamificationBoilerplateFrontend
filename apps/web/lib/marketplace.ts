import 'server-only';
import type { components } from '@forge/api-client';
import { forgeConfig } from '@forge/config';
import { notFound, redirect } from 'next/navigation';
import { authorizedClient, serverApi } from './accounts';

export type Listing = components['schemas']['ListingResponse'];
export type Category = Listing['category'];

export function requireMarketplace() {
  if (!forgeConfig.features.marketplace) notFound();
}

export async function browseListings(query: {
  q?: string;
  category?: Category;
  page: number;
}): Promise<components['schemas']['ListingPage']> {
  const { api } = await serverApi();
  const { data } = await api.GET('/api/v1/marketplace/listings', {
    cache: 'no-store',
    signal: AbortSignal.timeout(3500),
    params: { query },
  });
  if (!data) throw new Error('Unable to load listings');
  return data;
}

export async function listingDetail(id: string): Promise<Listing> {
  const { api } = await serverApi();
  const { data, response } = await api.GET(
    '/api/v1/marketplace/listings/{id}',
    {
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
      params: { path: { id } },
    },
  );
  if (response.status === 400 || response.status === 404) notFound();
  if (!data) throw new Error('Unable to load listing');
  return data;
}

export async function privateListings(
  kind: 'mine' | 'favorites',
  page: number,
): Promise<components['schemas']['ListingPage']> {
  const { api, options } = await authorizedClient();
  const { data, response } = await api.GET(
    kind === 'mine'
      ? '/api/v1/marketplace/mine'
      : '/api/v1/marketplace/favorites',
    { ...options, params: { query: { page } } },
  );
  if (response.status === 401) redirect('/auth/login');
  if (!data) throw new Error('Unable to load account listings');
  return data;
}

export async function favoriteState(id: string): Promise<boolean> {
  const { api, options } = await authorizedClient();
  const { data, response } = await api.GET(
    '/api/v1/marketplace/favorites/{id}',
    {
      ...options,
      params: { path: { id } },
    },
  );
  if (response.status === 401) redirect('/auth/login');
  if (!data) throw new Error('Unable to load favorite state');
  return data.saved;
}
