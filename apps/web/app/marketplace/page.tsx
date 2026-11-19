import { Button, Field, PageHeading, Panel } from '@forge/ui';
import Form from 'next/form';
import {
  ListingGrid,
  MarketNav,
  MarketPager,
  pageNumber,
} from '../../components/marketplace';
import { readAccount } from '../../lib/accounts';
import { market } from '../../lib/market-copy';
import {
  browseListings,
  requireMarketplace,
  type Category,
} from '../../lib/marketplace';

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    page?: string | string[];
  }>;
}) {
  requireMarketplace();
  const query = await searchParams;
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  const category =
    typeof query.category === 'string' &&
    Object.hasOwn(market.categories, query.category)
      ? (query.category as Category)
      : undefined;
  const page = pageNumber(query.page);
  const [{ items, hasNext }, account] = await Promise.all([
    browseListings({ q: q || undefined, category, page }),
    readAccount(),
  ]);
  return (
    <div className="market-stack">
      <div>
        <PageHeading title={market.title} description={market.description} />
        <MarketNav signedIn={Boolean(account)} />
      </div>
      <Panel>
        <Form action="/marketplace" className="market-filters">
          <Field id="market-query" label={market.search}>
            <input
              id="market-query"
              name="q"
              type="search"
              className="ui-input"
              defaultValue={q}
              maxLength={100}
            />
          </Field>
          <Field id="market-category" label={market.category}>
            <select
              id="market-category"
              name="category"
              className="ui-input"
              defaultValue={category ?? ''}
            >
              <option value="">{market.allCategories}</option>
              {Object.entries(market.categories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit">{market.filter}</Button>
        </Form>
      </Panel>
      <ListingGrid items={items} />
      <MarketPager
        current={page}
        hasNext={hasNext}
        filters={{ ...(q ? { q } : {}), ...(category ? { category } : {}) }}
      />
    </div>
  );
}
