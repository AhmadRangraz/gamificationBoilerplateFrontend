import { forgeConfig } from '@forge/config';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { lockAccount } from '../auth/account-transaction.js';
import { awardBusinessEvent } from '../gamification/award.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import type { ListingInput, ListingQuery } from './listing.dto.js';

const listingSelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  createdAt: true,
  owner: { select: { name: true } },
} satisfies Prisma.ListingSelect;

const visible = {
  owner: { suspendedAt: null },
} satisfies Prisma.ListingWhereInput;
const pageSize = 20;

function listingResponse({
  owner,
  ...listing
}: Prisma.ListingGetPayload<{ select: typeof listingSelect }>) {
  return { ...listing, sellerName: owner.name };
}

function missingListing() {
  return new NotFoundException('آگهی پیدا نشد.');
}

@Injectable()
export class ListingsService {
  constructor(private readonly db: PrismaService) {}

  browse({ category, q, page }: ListingQuery) {
    return this.list(
      {
        ...visible,
        category,
        OR: q
          ? [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      page,
    );
  }

  favorites(accountId: string, page: number) {
    return this.list({ ...visible, favorites: { some: { accountId } } }, page);
  }

  owned(ownerId: string, page: number) {
    return this.list({ ownerId }, page);
  }

  private async list(where: Prisma.ListingWhereInput, page: number) {
    const rows = await this.db.listing.findMany({
      where,
      select: listingSelect,
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return {
      items: rows.slice(0, pageSize).map(listingResponse),
      hasNext: page < 500 && rows.length > pageSize,
    };
  }

  async detail(id: string) {
    const listing = await this.db.listing.findUnique({
      where: { id, ...visible },
      select: listingSelect,
    });
    if (!listing) throw missingListing();
    return listingResponse(listing);
  }

  async create(ownerId: string, input: ListingInput) {
    const data = { ...input, ownerId };
    if (
      !forgeConfig.features.gamification ||
      !forgeConfig.gamification.rules.listingPublished
    ) {
      return listingResponse(
        await this.db.listing.create({ data, select: listingSelect }),
      );
    }
    return this.db.$transaction(
      async (tx) => {
        const account = await lockAccount(tx, ownerId);
        if (!account || account.suspendedAt)
          throw new UnauthorizedException('حساب کاربری فعال نیست.');
        const listing = await tx.listing.create({
          data,
          select: listingSelect,
        });
        await awardBusinessEvent(tx, {
          kind: 'LISTING_PUBLISHED',
          accountId: ownerId,
          listingId: listing.id,
        });
        return listingResponse(listing);
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  async update(ownerId: string, id: string, input: ListingInput) {
    try {
      return listingResponse(
        await this.db.listing.update({
          where: { id, ownerId },
          data: input,
          select: listingSelect,
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw missingListing();
      throw error;
    }
  }

  async remove(ownerId: string, id: string) {
    const result = await this.db.listing.deleteMany({ where: { id, ownerId } });
    if (!result.count) throw missingListing();
  }

  async isFavorite(accountId: string, listingId: string) {
    const count = await this.db.favorite.count({
      where: { accountId, listingId, listing: visible },
    });
    return { saved: count > 0 };
  }

  async saveFavorite(accountId: string, listingId: string) {
    const listing = await this.db.listing.findUnique({
      where: { id: listingId, ...visible },
      select: { id: true },
    });
    if (!listing) throw missingListing();
    try {
      await this.db.favorite.createMany({
        data: { accountId, listingId },
        skipDuplicates: true,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      )
        throw missingListing();
      throw error;
    }
  }

  async removeFavorite(accountId: string, listingId: string) {
    await this.db.favorite.deleteMany({ where: { accountId, listingId } });
  }
}
