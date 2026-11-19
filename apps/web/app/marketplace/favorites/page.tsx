import { PageHeading } from '@forge/ui';
import {
  ListingGrid,
  MarketNav,
  MarketPager,
  pageNumber,
} from '../../../components/marketplace';
import { requireAccount } from '../../../lib/accounts';
import { market } from '../../../lib/market-copy';
import { privateListings, requireMarketplace } from '../../../lib/marketplace';

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  requireMarketplace();
  await requireAccount();
  const page = pageNumber((await searchParams).page);
  const { items, hasNext } = await privateListings('favorites', page);
  return (
    <div className="market-stack">
      <div>
        <PageHeading
          title={market.favorites}
          description={market.favoritesDescription}
        />
        <MarketNav signedIn />
      </div>
      <ListingGrid items={items} />
      <MarketPager current={page} hasNext={hasNext} />
    </div>
  );
}
