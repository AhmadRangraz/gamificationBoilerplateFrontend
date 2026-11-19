import { forgeConfig } from '@forge/config';
import type { components } from '@forge/api-client';
import { formatJalaliDate, formatNumber } from '@forge/shared';
import { PageHeading, Panel } from '@forge/ui';
import { notFound } from 'next/navigation';
import { GamificationControls } from '../../../components/gamification-controls';
import { authorizedClient, requireAccount } from '../../../lib/accounts';
import { engagementCopy as copy } from '../../../lib/engagement-copy';

export default async function GamificationAdminPage() {
  if (!forgeConfig.features.gamification) notFound();
  await requireAccount(true);
  const { api, options } = await authorizedClient();
  const result = await api.GET('/api/v1/gamification/admin', options);
  const data: components['schemas']['AdminReport'] | undefined = result.data;
  if (!data) throw new Error('Unable to load gamification administration');
  const report = [
    [copy.participants, data.participants],
    [copy.capEvents, data.cappedEvents],
    [copy.entries, data.challengeEntries],
    [copy.redemptions, data.rewardRedemptions],
    [copy.referrals, data.verifiedReferrals],
  ] as const;
  return (
    <div className="progress-stack">
      <PageHeading title={copy.admin} description={copy.adminDescription} />
      <Panel>
        <dl className="streak-periods">
          {report.map(([label, count]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{formatNumber(count)}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <GamificationControls controls={data.controls} />
      {!!data.capSignals.length && (
        <Panel>
          <h2>{copy.capSignals}</h2>
          <ul className="progress-ledger" role="list">
            {data.capSignals.map(({ accountId, count }) => (
              <li key={accountId}>
                <bdi>{accountId}</bdi>
                <bdi>{formatNumber(count)}</bdi>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel>
        <h2>{copy.audit}</h2>
        <ul className="progress-ledger" role="list">
          {data.audit.map((entry, index) => (
            <li key={index}>
              <div className="reward-details">
                <bdi>{entry.key}</bdi>
                <time dateTime={entry.createdAt}>
                  {formatJalaliDate(new Date(entry.createdAt))}
                </time>
                <bdi>{entry.actorId}</bdi>
              </div>
              <bdi>{formatNumber(entry.value)}</bdi>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
