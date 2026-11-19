import { formatJalaliDate } from '@forge/shared';
import { PageHeading, Panel } from '@forge/ui';
import Link from 'next/link';
import { FavoriteButton } from '../../../components/favorite-button';
import { MarketNav, Price } from '../../../components/marketplace';
import { readAccount } from '../../../lib/accounts';
import { market } from '../../../lib/market-copy';
import {
  favoriteState,
  listingDetail,
  requireMarketplace,
} from '../../../lib/marketplace';

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireMarketplace();
  const { id } = await params;
  const [item, account] = await Promise.all([listingDetail(id), readAccount()]);
  const saved = account ? await favoriteState(id) : false;
  return (
    <div className="market-stack">
      <MarketNav signedIn={Boolean(account)} />
      <Panel>
        <PageHeading
          title={item.title}
          description={market.categories[item.category]}
        />
        <div className="market-detail">
          <p>{item.description}</p>
          <Price value={item.price} />
          <div className="market-card-footer">
            <span>
              {market.seller} <bdi>{item.sellerName}</bdi>
            </span>
            <time dateTime={item.createdAt}>
              {formatJalaliDate(new Date(item.createdAt))}
            </time>
          </div>
          {account ? (
            <FavoriteButton key={id} id={id} savedInitially={saved} />
          ) : (
            <Link className="market-entry" href="/auth/login">
              {market.loginToSave}
            </Link>
          )}
        </div>
      </Panel>
    </div>
  );
}
