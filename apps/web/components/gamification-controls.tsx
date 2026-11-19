'use client';

import type { components } from '@forge/api-client';
import { Button, Field, Notice, Panel } from '@forge/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ui } from '../lib/account-copy';
import { browserApi, runMutation } from '../lib/browser-api';
import { engagementCopy as copy } from '../lib/engagement-copy';

export function GamificationControls({
  controls,
}: Pick<components['schemas']['AdminReport'], 'controls'>) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>();
  const [pending, setPending] = useState(false);
  async function save(request: () => Promise<{ response: Response }>) {
    setPending(true);
    const error = await runMutation(request);
    setFailure(error);
    if (!error) router.refresh();
    setPending(false);
  }
  return (
    <>
      {failure !== undefined && (
        <Notice error={Boolean(failure)}>{failure ?? ui.saved}</Notice>
      )}
      {controls.map(({ key, value }) => (
        <Panel key={key}>
          <form
            className="ui-form"
            action={(data) =>
              save(() =>
                browserApi().PUT('/api/v1/gamification/admin/controls', {
                  body: { key, value: Number(data.get('value')) },
                }),
              )
            }
          >
            <Field id={key} label={`${copy.control} · ${key}`}>
              <input
                className="ui-input"
                id={key}
                type="number"
                name="value"
                min={0}
                max={key.startsWith('cap:') ? 100 : 1_000_000}
                defaultValue={value}
                required
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {ui.save}
            </Button>
          </form>
        </Panel>
      ))}
      <Panel>
        <h2>{copy.ranking}</h2>
        <form
          className="ui-form"
          action={(data) =>
            save(() =>
              browserApi().PUT('/api/v1/gamification/admin/ranking/{id}', {
                params: {
                  path: { id: String(data.get('accountId') ?? '').trim() },
                },
                body: { excluded: data.has('excluded') },
              }),
            )
          }
        >
          <Field id="ranking-account" label={copy.accountId}>
            <input
              className="ui-input"
              id="ranking-account"
              name="accountId"
              required
              maxLength={36}
              dir="ltr"
            />
          </Field>
          <label>
            <input type="checkbox" name="excluded" /> {copy.exclude}
          </label>
          <Button type="submit" disabled={pending}>
            {ui.save}
          </Button>
        </form>
      </Panel>
    </>
  );
}
