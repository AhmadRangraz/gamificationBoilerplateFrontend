'use client';

import type { components } from '@forge/api-client';
import { formatJalaliDate, formatNumber } from '@forge/shared';
import { Button, Field, Notice, Panel } from '@forge/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { browserApi, runMutation } from '../lib/browser-api';
import { ui } from '../lib/account-copy';
import { engagementCopy as copy } from '../lib/engagement-copy';
import { progressCopy } from '../lib/progress-copy';

export function Engagement({
  challenge,
  referral,
  goal,
  streakProtectionCost,
}: components['schemas']['EngagementView']) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean }>();
  async function save(request: () => Promise<{ response: Response }>) {
    setPending(true);
    const error = await runMutation(request);
    setNotice({ text: error ?? ui.saved, error: Boolean(error) });
    if (!error) router.refresh();
    setPending(false);
  }
  return (
    <>
      {notice && <Notice error={notice.error}>{notice.text}</Notice>}
      {challenge && (
        <Panel>
          <h2>{challenge.title}</h2>
          <p>
            {copy[challenge.mode]} · {copy.period[challenge.status]} ·{' '}
            {progressCopy.events[challenge.event]}
          </p>
          <p>
            {formatJalaliDate(new Date(challenge.startsAt))} –{' '}
            {formatJalaliDate(new Date(challenge.endsAt))}
          </p>
          <p>
            <bdi>
              {formatNumber(challenge.current)} /{' '}
              {formatNumber(challenge.target)}
            </bdi>
          </p>
          {!!challenge.leaders.length && (
            <>
              <h3>{copy.leaders}</h3>
              <ol>
                {challenge.leaders.map(({ name, count }, index) => (
                  <li key={index}>
                    <bdi>{name}</bdi> · {formatNumber(count)}
                  </li>
                ))}
              </ol>
            </>
          )}
          {challenge.joined ? (
            <p>{challenge.claimed ? copy.claimed : copy.enrolled}</p>
          ) : (
            challenge.status === 'ACTIVE' && (
              <Button
                disabled={pending}
                onClick={() =>
                  save(() =>
                    browserApi().POST(
                      '/api/v1/gamification/engagement/challenge/join',
                    ),
                  )
                }
              >
                {copy.join}
              </Button>
            )
          )}
          {challenge.claimable && (
            <Button
              disabled={pending}
              onClick={() =>
                save(() =>
                  browserApi().POST(
                    '/api/v1/gamification/engagement/challenge/claim',
                  ),
                )
              }
            >
              {copy.claim}
            </Button>
          )}
        </Panel>
      )}
      <Panel>
        <h2>{copy.goal}</h2>
        {goal && (
          <p>
            <bdi>
              {formatNumber(goal.current)} / {formatNumber(goal.target)}
            </bdi>
          </p>
        )}
        {goal && goal.current >= goal.target && (
          <Notice>{copy.goalDone}</Notice>
        )}
        <form
          className="ui-form"
          action={(data) =>
            save(() =>
              browserApi().PUT('/api/v1/gamification/engagement/goal', {
                body: { target: Number(data.get('target')) },
              }),
            )
          }
        >
          <Field id="personal-goal" label={copy.goalTarget}>
            <input
              className="ui-input"
              id="personal-goal"
              name="target"
              type="number"
              min={1}
              max={100}
              defaultValue={goal?.target ?? 5}
              required
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {ui.save}
          </Button>
        </form>
      </Panel>
      {streakProtectionCost !== null && (
        <Panel>
          <h2>{copy.protection}</h2>
          <p>
            {formatNumber(streakProtectionCost)} {progressCopy.points}
          </p>
          <div className="action-row">
            {(['freeze', 'recover'] as const).map((mode) => (
              <Button
                key={mode}
                disabled={pending}
                onClick={() =>
                  save(() =>
                    browserApi().POST(
                      '/api/v1/gamification/engagement/streak',
                      { body: { mode } },
                    ),
                  )
                }
              >
                {copy[mode]}
              </Button>
            ))}
          </div>
        </Panel>
      )}
      {referral && (
        <Panel>
          <h2>{copy.invite}</h2>
          <Field id="own-referral" label={copy.yourCode}>
            <input
              className="ui-input"
              id="own-referral"
              value={referral.code}
              readOnly
              dir="ltr"
            />
          </Field>
          {referral.canApply && (
            <form
              className="ui-form"
              action={(data) =>
                save(() =>
                  browserApi().POST(
                    '/api/v1/gamification/engagement/referral',
                    { body: { code: String(data.get('code') ?? '').trim() } },
                  ),
                )
              }
            >
              <Field id="referrer" label={copy.referrer}>
                <input
                  className="ui-input"
                  id="referrer"
                  name="code"
                  required
                  maxLength={36}
                  dir="ltr"
                />
              </Field>
              <Button type="submit" disabled={pending}>
                {ui.save}
              </Button>
            </form>
          )}
          {!!referral.qualified.length && (
            <ul className="progress-ledger" role="list">
              {referral.qualified.map(({ accountId }) => (
                <li key={accountId}>
                  <span>{copy.pendingReferral}</span>
                  <Button
                    disabled={pending}
                    onClick={() =>
                      save(() =>
                        browserApi().POST(
                          '/api/v1/gamification/engagement/referral/{id}/claim',
                          { params: { path: { id: accountId } } },
                        ),
                      )
                    }
                  >
                    {copy.claim}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}
