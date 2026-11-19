'use client';

import type { components } from '@forge/api-client';
import { formatJalaliDate, formatNumber } from '@forge/shared';
import { Button, Notice, Panel } from '@forge/ui';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { ui } from '../lib/account-copy';
import { apiError, browserApi } from '../lib/browser-api';
import { progressCopy as copy } from '../lib/progress-copy';

export function RewardCatalog({
  balance,
  rewards,
  redemptions,
}: components['schemas']['RewardsResponse']) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean }>();
  const inFlight = useRef(false);
  const retries = useRef(new Map<string, string>());

  async function redeem(rewardKey: string) {
    if (inFlight.current || refreshing) return;
    inFlight.current = true;
    setPending(true);
    setNotice(undefined);

    try {
      const requestId = retries.current.get(rewardKey) ?? crypto.randomUUID();
      retries.current.set(rewardKey, requestId);
      const { response } = await browserApi().POST(
        '/api/v1/gamification/rewards/redemptions',
        {
          body: { rewardKey, requestId },
        },
      );
      if (response.ok) {
        retries.current.delete(rewardKey);
        setNotice({ text: copy.rewardSaved, error: false });
        startTransition(() => router.refresh());
      } else {
        const text =
          response.status === 409
            ? copy.rewardConflict
            : response.status === 404
              ? copy.rewardUnavailable
              : apiError(response.status);
        setNotice({ text, error: true });
      }
    } catch {
      setNotice({ text: ui.retry, error: true });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <Panel>
        <p>
          {copy.rewardBalance} <strong>{formatNumber(balance)}</strong>
        </p>
        {notice && <Notice error={notice.error}>{notice.text}</Notice>}
        {!rewards.length ? (
          <p className="ui-hint">{copy.noRewards}</p>
        ) : (
          <ul className="progress-ledger" role="list">
            {rewards.map((reward) => (
              <li key={reward.key}>
                <div className="reward-details">
                  <strong>{reward.title}</strong>
                  <p>{reward.description}</p>
                  <bdi>
                    {formatNumber(reward.cost)} {copy.points}
                  </bdi>
                </div>
                <Button
                  aria-label={`${copy.redeem} ${reward.title}`}
                  disabled={pending || refreshing || balance < reward.cost}
                  onClick={() => redeem(reward.key)}
                >
                  {copy.redeem}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel>
        <h2>{copy.redemptionHistory}</h2>
        {!redemptions.length ? (
          <p className="ui-hint">{copy.noRedemptions}</p>
        ) : (
          <ul className="progress-ledger" role="list">
            {redemptions.map((receipt) => (
              <li key={receipt.id}>
                <div className="reward-details">
                  <strong>{receipt.title}</strong>
                  <time dateTime={receipt.createdAt}>
                    {formatJalaliDate(new Date(receipt.createdAt))}
                  </time>
                </div>
                <bdi>
                  {formatNumber(receipt.cost)} {copy.points}
                </bdi>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
