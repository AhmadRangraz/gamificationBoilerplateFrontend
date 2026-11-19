import type { components } from '@forge/api-client';
import { forgeConfig } from '@forge/config';
import { formatNumber } from '@forge/shared';
import { PageHeading, Panel } from '@forge/ui';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { authorizedClient } from '../../../lib/accounts';
import { ui } from '../../../lib/account-copy';
import { progressCopy as copy } from '../../../lib/progress-copy';

const periods = {
  daily: copy.daily,
  weekly: copy.weekly,
  monthly: copy.monthly,
  all: copy.all,
  season: forgeConfig.gamification.season?.title ?? '',
};
type Period = keyof typeof periods;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string | string[];
    page?: string | string[];
  }>;
}) {
  if (!forgeConfig.features.gamification) notFound();
  const query = await searchParams;
  const period =
    typeof query.period === 'string' &&
    Object.hasOwn(periods, query.period) &&
    (query.period !== 'season' || forgeConfig.gamification.season)
      ? (query.period as Period)
      : 'all';
  const page =
    typeof query.page === 'string' && /^\d{1,3}$/.test(query.page)
      ? Math.max(1, Math.min(500, Number(query.page)))
      : 1;
  const { api, options } = await authorizedClient();
  const result = await api.GET('/api/v1/gamification/leaderboard', {
    ...options,
    params: { query: { period, page } },
  });
  if (result.response.status === 401) redirect('/auth/login');
  const data: components['schemas']['RankingPage'] | undefined = result.data;
  if (!data) throw new Error('Unable to load rankings');

  return (
    <div className="progress-stack">
      <PageHeading
        title={copy.leaderboard}
        description={copy.leaderboardDescription}
      />
      <nav className="pager" aria-label={copy.leaderboard}>
        {Object.entries(periods)
          .filter(([, label]) => label)
          .map(([key, label]) => (
            <Link
              href={`?period=${key}`}
              aria-current={key === period ? 'page' : undefined}
              key={key}
            >
              {label}
            </Link>
          ))}
      </nav>
      <Panel>
        <p>
          {data.myRank === null
            ? copy.noRank
            : `${copy.myRank} ${formatNumber(data.myRank)}`}
        </p>
        {!data.rows.length ? (
          <p className="ui-hint">{copy.noRankingRows}</p>
        ) : (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={copy.leaderboard}
          >
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">{copy.rank}</th>
                  <th scope="col">{ui.name}</th>
                  <th scope="col">{copy.xp}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, index) => (
                  <tr key={index}>
                    <td>{formatNumber(row.rank)}</td>
                    <th scope="row">
                      <bdi>{row.name}</bdi>
                      {row.isMe && ` (${copy.myRow})`}
                    </th>
                    <td>{formatNumber(row.xp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <nav className="pager" aria-label={ui.pager}>
        {page > 1 && (
          <Link href={`?period=${period}&page=${page - 1}`}>{ui.previous}</Link>
        )}
        {data.hasNext && (
          <Link href={`?period=${period}&page=${page + 1}`}>{ui.next}</Link>
        )}
        <Link href="/progress">{copy.title}</Link>
      </nav>
    </div>
  );
}
