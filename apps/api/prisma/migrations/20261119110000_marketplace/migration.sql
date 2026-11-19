-- CreateEnum
CREATE TYPE "ListingCategory" AS ENUM ('HANDMADE', 'BOOKS', 'ELECTRONICS');

-- CreateTable
CREATE TABLE "Listing" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1200) NOT NULL,
    "category" "ListingCategory" NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "demoKey" VARCHAR(64),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "accountId" UUID NOT NULL,
    "listingId" UUID NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("accountId","listingId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_demoKey_key" ON "Listing"("demoKey");

-- CreateIndex
CREATE INDEX "Listing_createdAt_id_idx" ON "Listing"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Listing_category_createdAt_id_idx" ON "Listing"("category", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Listing_ownerId_createdAt_id_idx" ON "Listing"("ownerId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Favorite_listingId_idx" ON "Favorite"("listingId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

