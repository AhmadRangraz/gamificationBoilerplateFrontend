import type { components } from '@forge/api-client';
import { forgeConfig } from '@forge/config';
import { formatJalaliDate, formatNumber } from '@forge/shared';
import { Notice, PageHeading, Panel, StatusBadge } from '@forge/ui';
import Link from 'next/link';
import { RankingPreference } from '../../components/ranking-preference';
import { notFound, redirect } from 'next/navigation';
import { authorizedClient } from '../../lib/accounts';
import { progressCopy as copy } from '../../lib/progress-copy';
import { engagementCopy } from '../../lib/engagement-copy';

export default async function ProgressPage() {
  if (!forgeConfig.features.gamification) notFound();
  const { api, options } = await authorizedClient();
  const result = await api.GET('/api/v1/gamification/me', options);
  const data: components['schemas']['ProgressResponse'] | undefined =
    result.data;
  if (result.response.status === 401) redirect('/auth/login');
  if (!data) throw new Error('Unable to load progress');
  const target = data.nextLevelAt;
  const { quest, mission } = data;
  const timeLabel = new Intl.DateTimeFormat(forgeConfig.locale, {
    timeZone: forgeConfig.timezone,
    timeStyle: 'short',
    numberingSystem: forgeConfig.digits === 'persian' ? 'arabext' : 'latn',
  });
  const dayLabel = new Intl.DateTimeFormat(forgeConfig.locale, {
    calendar: 'persian',
    timeZone: 'UTC',
    day: 'numeric',
    numberingSystem: forgeConfig.digits === 'persian' ? 'arabext' : 'latn',
  });
  const civilDateConfig = { ...forgeConfig, timezone: 'UTC' };
  const max = target === null ? 1 : target - data.levelStartAt;
  const value = target === null ? 1 : data.xp - data.levelStartAt;
  const earnedLevel =
    data.level > 1 &&
    data.xp - (data.ledger.find(({ xp }) => xp > 0)?.xp ?? 0) <
      data.levelStartAt;

  return (
    <div className="progress-stack">
      <PageHeading title={copy.title} description={copy.description} />
      {earnedLevel && <Notice>{engagementCopy.levelUp}</Notice>}
      {data.rewardDiscount > 0 && (
        <Notice>
          {engagementCopy.discount} · {formatNumber(data.rewardDiscount)}٪
        </Notice>
      )}
      <Panel>
        <dl className="progress-metrics">
          <div>
            <dt>{copy.points}</dt>
            <dd>{formatNumber(data.points)}</dd>
          </div>
          <div>
            <dt>{copy.xp}</dt>
            <dd>{formatNumber(data.xp)}</dd>
          </div>
          <div>
            <dt>{copy.level}</dt>
            <dd>{formatNumber(data.level)}</dd>
          </div>
        </dl>
        <div className="progress-level">
          <progress max={max} value={value} aria-label={copy.next} />
          <p>
            {target === null
              ? copy.highest
              : `${formatNumber(target - data.xp)} ${copy.xp} ${copy.next}`}
          </p>
        </div>
      </Panel>
      {quest && (
        <Panel>
          <h2>{quest.title}</h2>
          <p>{copy.events[quest.event]}</p>
          <StatusBadge ready={quest.status === 'COMPLETED'}>
            {copy.questStatuses[quest.status]}
          </StatusBadge>
          <div className="progress-level">
            <progress
              max={quest.target}
              value={quest.current}
              aria-label={copy.questProgress}
            />
            <p>
              <bdi>
                {formatNumber(quest.current)} / {formatNumber(quest.target)}
              </bdi>
            </p>
          </div>
          <dl className="streak-periods">
            {quest.day ? (
              <div>
                <dt>
                  {quest.cadence === 'weekly'
                    ? copy.questWeekly
                    : copy.questDaily}
                </dt>
                <dd>
                  <time dateTime={quest.day}>
                    {formatJalaliDate(
                      new Date(`${quest.day}T00:00:00Z`),
                      civilDateConfig,
                    )}
                  </time>
                </dd>
                <dd>
                  {quest.cadence === 'weekly'
                    ? copy.questResetsWeekly
                    : copy.questResetsDaily}
                </dd>
              </div>
            ) : (
              (['startsAt', 'endsAt'] as const).map((edge) => {
                const timestamp = quest[edge];
                if (!timestamp) return null;
                const date = new Date(timestamp);
                return (
                  <div key={edge}>
                    <dt>
                      {edge === 'startsAt' ? copy.questStarts : copy.questEnds}
                    </dt>
                    <dd>
                      <time dateTime={timestamp}>
                        {formatJalaliDate(date)} · {timeLabel.format(date)}
                      </time>
                    </dd>
                  </div>
                );
              })
            )}
            <div>
              <dt>{copy.questReward}</dt>
              <dd>
                {formatNumber(quest.points)} {copy.points} ·{' '}
                {formatNumber(quest.xp)} {copy.xp}
              </dd>
            </div>
          </dl>
        </Panel>
      )}
      {mission && (
        <Panel>
          <h2>{mission.title}</h2>
          <ol className="progress-ledger" role="list">
            {mission.steps.map((step, index) => (
              <li
                key={index}
                aria-current={step.status === 'ACTIVE' ? 'step' : undefined}
              >
                <strong>{copy.events[step.event]}</strong>
                <bdi>
                  {formatNumber(step.current)} / {formatNumber(step.target)}
                </bdi>
                <StatusBadge ready={step.status === 'COMPLETED'}>
                  {copy.missionStepStatuses[step.status]}
                </StatusBadge>
              </li>
            ))}
          </ol>
          <dl className="streak-periods">
            <div>
              <dt>{copy.questReward}</dt>
              <dd>
                {formatNumber(mission.points)} {copy.points} ·{' '}
                {formatNumber(mission.xp)} {copy.xp}
              </dd>
            </div>
          </dl>
        </Panel>
      )}
      <Panel>
        <div className="action-row">
          <Link className="status-link" href="/progress/leaderboard">
            {copy.leaderboard}
          </Link>
          <Link className="status-link" href="/progress/rewards">
            {copy.rewards}
          </Link>
          <Link className="status-link" href="/progress/engagement">
            {engagementCopy.title}
          </Link>
          <RankingPreference optedIn={data.leaderboardOptIn} />
        </div>
      </Panel>
      {data.achievements.length > 0 && (
        <Panel>
          <h2>{copy.achievements}</h2>
          <ul className="progress-ledger">
            {data.achievements.map((badge) => (
              <li key={badge.kind}>
                <strong>{copy.badges[badge.kind]}</strong>
                <bdi>
                  {formatNumber(Math.min(badge.current, badge.target))} /{' '}
                  {formatNumber(badge.target)}
                </bdi>
                <StatusBadge ready={badge.unlocked}>
                  {badge.unlocked ? copy.unlocked : copy.locked}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {!!data.badges.length && (
        <Panel>
          <h2>{engagementCopy.showcase}</h2>
          <ul className="progress-ledger" role="list">
            {data.badges.map((badge) => (
              <li key={badge.key}>
                <div>
                  <strong>{badge.title}</strong>
                  <p>
                    {engagementCopy.category[badge.category]} ·{' '}
                    {engagementCopy.rarity[badge.rarity]}
                  </p>
                </div>
                <bdi>
                  {formatNumber(Math.min(badge.current, badge.target))} /{' '}
                  {formatNumber(badge.target)}
                </bdi>
                <StatusBadge ready={badge.unlocked}>
                  {badge.unlocked ? copy.unlocked : copy.locked}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel>
        <h2>{copy.streaks}</h2>
        <dl className="streak-periods">
          {(['daily', 'weekly'] as const).map((period) => (
            <div key={period}>
              <dt>{copy[period]}</dt>
              <dd>
                {copy.current} {formatNumber(data[period].current)} ·{' '}
                {copy.longest} {formatNumber(data[period].longest)}
              </dd>
            </div>
          ))}
        </dl>
        <ul className="streak-days" aria-label={copy.recentDays}>
          {data.recentDays.map(({ day, active }) => {
            const date = new Date(`${day}T00:00:00Z`);
            const label = `${formatJalaliDate(date, civilDateConfig)} · ${active ? copy.activeDay : copy.inactiveDay}`;
            return (
              <li key={day} data-active={active}>
                <time dateTime={day} title={label} aria-label={label}>
                  {dayLabel.format(date)}
                </time>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel>
        <h2>{copy.ledger}</h2>
        {data.ledger.length === 0 ? (
          <p className="ui-hint">{copy.empty}</p>
        ) : (
          <ul className="progress-ledger">
            {data.ledger.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{copy.events[entry.event]}</strong>
                  <time dateTime={entry.createdAt}>
                    {formatJalaliDate(new Date(entry.createdAt))}
                  </time>
                </div>
                <span>
                  {entry.outcome === 'CAPPED'
                    ? copy.dailyLimit
                    : `${formatNumber(entry.points)} ${copy.points} · ${formatNumber(entry.xp)} ${copy.xp}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
