import { forgeConfig } from '@forge/config';
import type { components } from '@forge/api-client';
import { notFound, redirect } from 'next/navigation';
import { PageHeading } from '@forge/ui';
import { LocalAssistant } from '../../components/local-assistant';
import { authorizedClient } from '../../lib/accounts';
import { presetRoutes } from '../../lib/preset-copy';

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  if (!forgeConfig.features.assistant) notFound();
  const id = (await searchParams).id;
  const { api, options } = await authorizedClient();
  const catalog = await api.GET('/api/v1/assistant/conversations', options);
  if (catalog.response.status === 401) redirect('/auth/login');
  const conversations: components['schemas']['ConversationView'][] | undefined =
    catalog.data;
  if (!conversations) throw new Error('Unable to load conversations');
  const active = conversations.find((conversation) => conversation.id === id);
  if (id && !active) notFound();
  const result =
    active &&
    (await api.GET('/api/v1/assistant/conversations/{id}', {
      ...options,
      params: { path: { id: active.id } },
    }));
  if (result?.response.status === 401) redirect('/auth/login');
  if (result?.response.status === 404) notFound();
  if (active && !result?.data) throw new Error('Unable to load conversation');
  const route = presetRoutes.assistant;
  return (
    <div className="progress-stack">
      <PageHeading title={route.label} description={route.description} />
      <LocalAssistant
        key={id ?? 'new'}
        active={active}
        conversations={conversations}
        turns={result?.data ?? []}
      />
    </div>
  );
}
