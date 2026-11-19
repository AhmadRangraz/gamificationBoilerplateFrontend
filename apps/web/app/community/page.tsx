import { forgeConfig } from '@forge/config';
import { notFound, redirect } from 'next/navigation';
import { PageHeading } from '@forge/ui';
import Link from 'next/link';
import { SocialFeed } from '../../components/social-feed';
import { authorizedClient } from '../../lib/accounts';
import { ui } from '../../lib/account-copy';
import { presetRoutes } from '../../lib/preset-copy';

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (!forgeConfig.features.community) notFound();
  const query = (await searchParams).page;
  const page =
    typeof query === 'string' && /^\d{1,4}$/.test(query)
      ? Math.max(1, Math.min(1000, Number(query)))
      : 1;
  const { api, options } = await authorizedClient();
  const { data, response } = await api.GET('/api/v1/community', {
    ...options,
    params: { query: { page } },
  });
  if (response.status === 401) redirect('/auth/login');
  if (!data) throw new Error('Unable to load community');
  const route = presetRoutes.community;
  return (
    <div className="progress-stack">
      <PageHeading title={route.label} description={route.description} />
      <SocialFeed {...data} />
      {(page > 1 || data.hasNext) && (
        <nav className="pager" aria-label={ui.pager}>
          {page > 1 && <Link href={`?page=${page - 1}`}>{ui.previous}</Link>}
          {data.hasNext && <Link href={`?page=${page + 1}`}>{ui.next}</Link>}
        </nav>
      )}
    </div>
  );
}
