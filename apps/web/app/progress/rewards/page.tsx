import { forgeConfig } from '@forge/config';
import { PageHeading } from '@forge/ui';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RewardCatalog } from '../../../components/reward-catalog';
import { authorizedClient } from '../../../lib/accounts';
import { progressCopy as copy } from '../../../lib/progress-copy';

export default async function RewardsPage() {
  if (!forgeConfig.features.gamification) notFound();
  const { api, options } = await authorizedClient();
  const { data, response } = await api.GET(
    '/api/v1/gamification/rewards',
    options,
  );
  if (response.status === 401) redirect('/auth/login');
  if (!data) throw new Error('Unable to load rewards');

  return (
    <div className="progress-stack">
      <PageHeading title={copy.rewards} description={copy.rewardsDescription} />
      <RewardCatalog {...data} />
      <div>
        <Link className="status-link" href="/progress">
          {copy.title}
        </Link>
      </div>
    </div>
  );
}
