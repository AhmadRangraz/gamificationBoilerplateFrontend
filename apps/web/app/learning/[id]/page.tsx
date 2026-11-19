import { forgeConfig } from '@forge/config';
import { notFound, redirect } from 'next/navigation';
import { Panel } from '@forge/ui';
import Link from 'next/link';
import { LessonComplete } from '../../../components/lesson-complete';
import { authorizedClient } from '../../../lib/accounts';
import { presetRoutes } from '../../../lib/preset-copy';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!forgeConfig.features.learning) notFound();
  const { id } = await params;
  const { api, options } = await authorizedClient();
  const { data, response } = await api.GET('/api/v1/learning/lessons/{id}', {
    ...options,
    params: { path: { id } },
  });
  if (response.status === 401) redirect('/auth/login');
  if ([400, 404].includes(response.status)) notFound();
  if (!data) throw new Error('Unable to load lesson');
  return (
    <div className="progress-stack">
      <Panel>
        <h1>{data.title}</h1>
        <p className="preset-prose">{data.body}</p>
        <LessonComplete id={id} completed={data.completed} />
      </Panel>
      <div>
        <Link className="status-link" href="/learning">
          {presetRoutes.learning.label}
        </Link>
      </div>
    </div>
  );
}
