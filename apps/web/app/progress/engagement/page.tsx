import { forgeConfig } from '@forge/config';
import { PageHeading } from '@forge/ui';
import { notFound, redirect } from 'next/navigation';
import { authorizedClient } from '../../../lib/accounts';
import { Engagement } from '../../../components/engagement';
import { engagementCopy as copy } from '../../../lib/engagement-copy';

export default async function EngagementPage() {
  if (!forgeConfig.features.gamification) notFound();
  const { api, options } = await authorizedClient();
  const { data, response } = await api.GET(
    '/api/v1/gamification/engagement',
    options,
  );
  if (response.status === 401) redirect('/auth/login');
  if (!data) throw new Error('Unable to load engagement');
  return (
    <div className="progress-stack">
      <PageHeading title={copy.title} description={copy.description} />
      <Engagement {...data} />
    </div>
  );
}
