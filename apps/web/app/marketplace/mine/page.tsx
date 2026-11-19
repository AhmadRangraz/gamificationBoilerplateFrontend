import { PageHeading } from '@forge/ui';
import { ListingManager } from '../../../components/listing-manager';
import {
  MarketNav,
  MarketPager,
  pageNumber,
} from '../../../components/marketplace';
import { requireAccount } from '../../../lib/accounts';
import { market } from '../../../lib/market-copy';
import { privateListings, requireMarketplace } from '../../../lib/marketplace';

export default async function MinePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  requireMarketplace();
  await requireAccount();
  const page = pageNumber((await searchParams).page);
  const { items, hasNext } = await privateListings('mine', page);
  return (
    <div className="market-stack">
      <div>
        <PageHeading title={market.mine} description={market.mineDescription} />
        <MarketNav signedIn />
      </div>
      <ListingManager listings={items} />
      <MarketPager current={page} hasNext={hasNext} />
    </div>
  );
}
