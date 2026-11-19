import { formatJalaliDate } from '@forge/shared';
import { StatusBadge } from '@forge/ui';
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  Database,
  Monitor,
  Server,
} from 'lucide-react';
import { connection } from 'next/server';
import { fa } from '../lib/copy';
import { healthPath, readStatus } from '../lib/status';

const flowNodes = {
  web: { name: fa.web, tech: 'Next.js', icon: Monitor },
  api: { name: fa.api, tech: 'NestJS', icon: Server },
  database: { name: fa.database, tech: 'PostgreSQL', icon: Database },
};

export default async function Home() {
  await connection();
  const status = await readStatus();
  const now = new Date();
  const ready = status.database === 'ready';

  const services = [
    { ...flowNodes.web, description: fa.webDescription, state: 'ready' },
    { ...flowNodes.api, description: fa.apiDescription, state: status.api },
    {
      ...flowNodes.database,
      description: fa.databaseDescription,
      state: status.database,
    },
  ] as const;

  return (
    <>
      <section className="hero" aria-labelledby="overview-title">
        <div className="hero-content">
          <span className="hero-status" data-ready={ready}>
            <Activity size={16} aria-hidden="true" />{' '}
            {ready ? fa.allReady : fa.needsAttention}
          </span>
          <h1 id="overview-title">{fa.heroTitle}</h1>
          <p>{fa.heroDescription}</p>
          <p className="checked-date">
            {fa.lastChecked}
            <time dateTime={now.toISOString()}>{formatJalaliDate(now)}</time>
          </p>
        </div>
        <div className="hero-grid" aria-hidden="true" />
      </section>

      <section className="section" aria-labelledby="service-title">
        <div className="section-heading">
          <div>
            <h2 id="service-title">{fa.services}</h2>
            <p>{fa.servicesDescription}</p>
          </div>
          <a className="status-link" href={healthPath}>
            {fa.rawStatus}
            <ArrowLeft size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="services-grid">
          {services.map(({ name, tech, description, state, icon: Icon }) => (
            <article key={tech} className="service-card" data-service={tech}>
              <div className="service-top">
                <span className="service-icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <StatusBadge ready={state === 'ready'}>{fa[state]}</StatusBadge>
              </div>
              <h3>{name}</h3>
              <bdi dir="ltr" className="technology">
                {tech}
              </bdi>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="flow" className="flow-panel" aria-labelledby="flow-title">
        <div>
          <h2 id="flow-title">{fa.flow}</h2>
          <p>{fa.flowDescription}</p>
        </div>
        <ol className="flow-nodes">
          {Object.values(flowNodes).map(({ name, icon: Icon, tech }, index) => (
            <li key={tech}>
              {index > 0 && (
                <>
                  <ArrowLeft
                    className="flow-arrow horizontal-arrow"
                    size={16}
                    aria-hidden="true"
                  />
                  <ArrowDown
                    className="flow-arrow vertical-arrow"
                    size={16}
                    aria-hidden="true"
                  />
                </>
              )}
              <span>
                <Icon size={16} aria-hidden="true" />
                {name}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
