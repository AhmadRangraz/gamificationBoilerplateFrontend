import { formatNumber } from '@forge/shared';
import { Panel } from '@forge/ui';
import { Bookmark, Store, Tag } from 'lucide-react';
import Link from 'next/link';
import { ui } from '../lib/account-copy';
import { market } from '../lib/market-copy';
import type { Listing } from '../lib/marketplace';

export function MarketNav({ signedIn }: { signedIn: boolean }) {
  return (
    <nav className="market-links" aria-label={market.title}>
      <Link href="/marketplace">
        <Store size={17} aria-hidden="true" />
        {market.title}
      </Link>
      {signedIn && (
        <>
          <Link href="/marketplace/mine">
            <Tag size={17} aria-hidden="true" />
            {market.mine}
          </Link>
          <Link href="/marketplace/favorites">
            <Bookmark size={17} aria-hidden="true" />
            {market.favorites}
          </Link>
        </>
      )}
      {!signedIn && <Link href="/auth/login">{ui.login}</Link>}
    </nav>
  );
}

export function Price({ value }: { value: number }) {
  return (
    <strong className="market-price">
      {value === 0 ? market.free : `${formatNumber(value)} ${market.currency}`}
    </strong>
  );
}

export function ListingGrid({ items }: { items: Listing[] }) {
  if (!items.length)
    return (
      <Panel>
        <p className="ui-hint">{market.empty}</p>
      </Panel>
    );
  return (
    <div className="market-grid">
      {items.map((item) => (
        <article className="ui-panel market-card" key={item.id}>
          <span className="market-category">
            <Tag size={15} aria-hidden="true" />
            {market.categories[item.category]}
          </span>
          <h2>
            <Link href={`/marketplace/${item.id}`}>{item.title}</Link>
          </h2>
          <p className="market-excerpt">{item.description}</p>
          <div className="market-card-footer">
            <Price value={item.price} />
            <bdi>{item.sellerName}</bdi>
          </div>
        </article>
      ))}
    </div>
  );
}

export function pageNumber(value?: string | string[]) {
  return typeof value === 'string' && /^\d{1,3}$/.test(value)
    ? Math.max(1, Math.min(500, Number(value)))
    : 1;
}

export function MarketPager({
  current,
  hasNext,
  filters = {},
}: {
  current: number;
  hasNext: boolean;
  filters?: Record<string, string>;
}) {
  if (current === 1 && !hasNext) return null;
  function href(page: number) {
    return `?${new URLSearchParams({ ...filters, page: String(page) })}`;
  }
  return (
    <nav className="pager" aria-label={ui.pager}>
      {current > 1 && <Link href={href(current - 1)}>{ui.previous}</Link>}
      <span aria-current="page">{formatNumber(current)}</span>
      {hasNext && <Link href={href(current + 1)}>{ui.next}</Link>}
    </nav>
  );
}
