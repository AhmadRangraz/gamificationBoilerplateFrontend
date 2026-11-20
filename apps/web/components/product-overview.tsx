import { forgeConfig } from '@forge/config';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleHelp,
  Code2,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  MonitorSmartphone,
  Gift,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Trophy,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { readAccount } from '../lib/accounts';
import { ui } from '../lib/account-copy';
import { fa } from '../lib/copy';
import {
  overviewCapabilities as copy,
  overviewCopy,
  type OverviewCapability,
} from '../lib/overview-copy';
import { progressCopy } from '../lib/progress-copy';

const groups = [
  {
    id: 'engagement',
    cards: [
      { ...copy.progress, icon: Trophy },
      { ...copy.campaigns, icon: Target },
      { ...copy.rewards, icon: Gift },
      { ...copy.rankings, icon: UsersRound },
    ],
  },
  {
    id: 'products',
    cards: [
      { ...copy.marketplace, icon: Store },
      { ...copy.booking, icon: CalendarDays },
      { ...copy.community, icon: MessageCircle },
      { ...copy.learning, icon: GraduationCap },
      { ...copy.assistant, icon: Sparkles },
    ],
  },
  {
    id: 'foundation',
    cards: [
      { ...copy.accounts, icon: ShieldCheck },
      { ...copy.workspaces, icon: LayoutDashboard },
      { ...copy.experience, icon: MonitorSmartphone },
      { ...copy.platform, icon: Code2 },
    ],
  },
] as const;

export default async function ProductOverview() {
  const account = await readAccount();
  const { features } = forgeConfig;

  function demoLink(demo: OverviewCapability['demo']) {
    if (!demo) return null;
    if (demo.feature && !features[demo.feature])
      return (
        <span className="overview-card-note">
          <CircleHelp size={16} aria-hidden="true" />
          {overviewCopy.unavailable}
        </span>
      );
    if (demo.admin && account?.role !== 'ADMIN')
      return (
        <span className="overview-card-note">
          <ShieldCheck size={16} aria-hidden="true" />
          {overviewCopy.administrator}
        </span>
      );
    return (
      <Link className="status-link" href={demo.href}>
        {demo.label}
        <ArrowLeft size={16} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div className="product-overview">
      <section className="hero overview-hero" aria-labelledby="product-title">
        <div className="hero-content">
          <h1 id="product-title">{overviewCopy.title}</h1>
          <p>{overviewCopy.description}</p>
          <div className="action-row overview-actions">
            {features.gamification && (
              <Link className="status-link" href="/progress">
                <Trophy size={17} aria-hidden="true" />
                {progressCopy.title}
              </Link>
            )}
            {!features.gamification && !account && (
              <Link className="status-link" href="/auth/register">
                {ui.register}
              </Link>
            )}
            <a className="overview-hero-link" href="#engagement">
              {overviewCopy.browse}
              <ArrowLeft size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="hero-grid" aria-hidden="true" />
      </section>

      <nav className="overview-index" aria-label={overviewCopy.browse}>
        {groups.map(({ id }) => (
          <a className="status-link" key={id} href={`#${id}`}>
            {overviewCopy.groups[id].title}
          </a>
        ))}
      </nav>

      {groups.map(({ id, cards }) => (
        <section
          id={id}
          className="section overview-section"
          key={id}
          aria-labelledby={`${id}-heading`}
        >
          <div className="section-heading">
            <div>
              <h2 id={`${id}-heading`}>{overviewCopy.groups[id].title}</h2>
              <p>{overviewCopy.groups[id].description}</p>
            </div>
            {id === 'engagement' &&
              features.gamification &&
              account?.role === 'ADMIN' && (
                <Link className="status-link" href="/admin/gamification">
                  {fa.gamificationAdmin}
                  <ArrowLeft size={16} aria-hidden="true" />
                </Link>
              )}
          </div>
          <div className="overview-grid">
            {cards.map((card: OverviewCapability & { icon: typeof Trophy }) => (
              <article className="service-card overview-card" key={card.title}>
                <span className="service-icon">
                  <card.icon size={22} aria-hidden="true" />
                </span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <ul>
                  {card.details.map((detail) => (
                    <li key={detail}>
                      <Check size={16} aria-hidden="true" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                {card.demo && (
                  <div className="overview-card-action">
                    {demoLink(card.demo)}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
