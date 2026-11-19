'use client';

import type { components } from '@forge/api-client';
import { Button, Field, Notice, Panel } from '@forge/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { ui } from '../lib/account-copy';
import { apiError, browserApi, runMutation } from '../lib/browser-api';
import { presetCopy as copy } from '../lib/preset-copy';

type Conversation = components['schemas']['ConversationView'];
type Turn = components['schemas']['TurnView'];
type Chunk =
  { type: 'delta'; delta: string } | { type: 'complete'; turn: Turn };

export function LocalAssistant({
  active,
  conversations,
  turns,
}: {
  active?: Conversation;
  conversations: Conversation[];
  turns: Turn[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState('');
  const [received, setReceived] = useState<Turn>();
  const retry = useRef<{ requestId: string; prompt: string }>(undefined);
  const history =
    received && !turns.some(({ id }) => id === received.id)
      ? [...turns, received]
      : turns;

  async function create(data: FormData) {
    setPending(true);
    setFailure(undefined);
    try {
      const { data: conversation, response } = await browserApi().POST(
        '/api/v1/assistant/conversations',
        { body: { title: String(data.get('title') ?? '').trim() } },
      );
      if (conversation) router.push(`/assistant?id=${conversation.id}`);
      else setFailure(apiError(response.status));
    } catch {
      setFailure(ui.retry);
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setPending(true);
    const error = await runMutation(() =>
      browserApi().DELETE('/api/v1/assistant/conversations/{id}', {
        params: { path: { id } },
      }),
    );
    if (error) setFailure(error);
    else {
      router.push('/assistant');
      router.refresh();
    }
    setPending(false);
  }

  async function send(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (pending || !prompt.trim()) return;
    const text = prompt.trim();
    if (retry.current?.prompt !== text)
      retry.current = { requestId: crypto.randomUUID(), prompt: text };
    setPending(true);
    setFailure(undefined);
    setDraft('');
    try {
      const response = await fetch(
        `/api/v1/assistant/conversations/${id}/turns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retry.current),
        },
      );
      if (!response.ok || !response.body) {
        setFailure(apiError(response.status));
        return;
      }
      let buffer = '';
      let complete: Turn | undefined;
      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      for (
        let chunk = await reader.read();
        !chunk.done;
        chunk = await reader.read()
      ) {
        const lines = (buffer + chunk.value).split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const chunk = JSON.parse(line) as Chunk;
          if (chunk.type === 'delta')
            setDraft((previous) => previous + chunk.delta);
          else complete = chunk.turn;
        }
      }
      if (!complete) throw new Error('Incomplete response');
      retry.current = undefined;
      setReceived(complete);
      setPrompt('');
      router.refresh();
    } catch {
      setFailure(ui.retry);
    } finally {
      setDraft('');
      setPending(false);
    }
  }
  return (
    <>
      {failure && <Notice error>{failure}</Notice>}
      <Panel>
        <h2>{copy.conversations}</h2>
        <ul className="progress-ledger" role="list">
          {conversations.map(({ id, title }) => (
            <li key={id}>
              <Link
                className="status-link"
                aria-current={id === active?.id ? 'page' : undefined}
                href={`/assistant?id=${id}`}
              >
                {title}
              </Link>
            </li>
          ))}
        </ul>
        <form className="ui-form" action={create}>
          <Field id="conversation-title" label={copy.title}>
            <input
              className="ui-input"
              id="conversation-title"
              name="title"
              maxLength={100}
              required
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {copy.newConversation}
          </Button>
        </form>
      </Panel>
      {active && (
        <Panel>
          <h2>{active.title}</h2>
          <ol className="progress-ledger" role="list">
            {history.map((turn) => (
              <li key={turn.id}>
                <div>
                  <strong className="preset-prose">{turn.prompt}</strong>
                  <p className="preset-prose">{turn.reply}</p>
                  <small>
                    {copy.topic} ·{' '}
                    {copy.topics[turn.topic as keyof typeof copy.topics] ??
                      turn.topic}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          {pending && <span role="status">{copy.processing}</span>}
          {draft && (
            <p className="preset-prose" aria-hidden="true">
              {draft}
            </p>
          )}
          <form
            className="ui-form"
            onSubmit={(event) => send(event, active.id)}
          >
            <Field id="assistant-prompt" label={copy.prompt}>
              <textarea
                className="ui-input"
                id="assistant-prompt"
                maxLength={1000}
                required
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </Field>
            <div className="action-row">
              <Button type="submit" disabled={pending}>
                {copy.send}
              </Button>
              <Button
                tone="quiet"
                disabled={pending}
                onClick={() => setPrompt(copy.mockPrompt)}
              >
                {copy.mockPrompt}
              </Button>
            </div>
          </form>
          <Button
            tone="danger"
            disabled={pending}
            onClick={() => remove(active.id)}
          >
            {copy.deleteConversation}
          </Button>
        </Panel>
      )}
    </>
  );
}
