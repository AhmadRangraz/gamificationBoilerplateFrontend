-- CreateEnum
CREATE TYPE "PointEvent" AS ENUM ('EMAIL_VERIFIED', 'LISTING_PUBLISHED');

-- CreateEnum
CREATE TYPE "PointOutcome" AS ENUM ('AWARDED', 'CAPPED');

-- CreateTable
CREATE TABLE "PointEntry" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "event" "PointEvent" NOT NULL,
    "sourceId" UUID NOT NULL,
    "outcome" "PointOutcome" NOT NULL,
    "points" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "earnedDay" CHAR(10) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointEntry_accountId_event_earnedDay_outcome_idx" ON "PointEntry"("accountId", "event", "earnedDay", "outcome");

-- CreateIndex
CREATE INDEX "PointEntry_accountId_createdAt_id_idx" ON "PointEntry"("accountId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PointEntry_event_sourceId_key" ON "PointEntry"("event", "sourceId");

-- AddForeignKey
ALTER TABLE "PointEntry" ADD CONSTRAINT "PointEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

