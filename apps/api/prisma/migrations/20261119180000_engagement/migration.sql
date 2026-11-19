-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PointEvent" ADD VALUE 'CHALLENGE_COMPLETED';
ALTER TYPE "PointEvent" ADD VALUE 'REFERRAL_COMPLETED';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "leaderboardBanned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChallengeEntry" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "challengeKey" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ChallengeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeGroup" (
    "key" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ChallengeGroup_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Referral" (
    "accountId" UUID NOT NULL,
    "referrerId" UUID NOT NULL,
    "qualifiedAt" TIMESTAMPTZ(3),
    "claimedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "ActivityGoal" (
    "accountId" UUID NOT NULL,
    "target" INTEGER NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ActivityGoal_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "GamificationControl" (
    "key" VARCHAR(80) NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "GamificationControl_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "GamificationAudit" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamificationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChallengeEntry_challengeKey_idx" ON "ChallengeEntry"("challengeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeEntry_accountId_challengeKey_key" ON "ChallengeEntry"("accountId", "challengeKey");

-- CreateIndex
CREATE INDEX "Referral_referrerId_qualifiedAt_idx" ON "Referral"("referrerId", "qualifiedAt");

-- AddForeignKey
ALTER TABLE "ChallengeEntry" ADD CONSTRAINT "ChallengeEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityGoal" ADD CONSTRAINT "ActivityGoal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "ChallengeEntry" ADD CHECK ("count" BETWEEN 0 AND 100);
ALTER TABLE "ChallengeGroup" ADD CHECK ("count" BETWEEN 1 AND 100);
ALTER TABLE "ActivityGoal" ADD CHECK ("target" BETWEEN 1 AND 100);
ALTER TABLE "Referral" ADD CHECK ("accountId" <> "referrerId" AND ("claimedAt" IS NULL OR "qualifiedAt" IS NOT NULL));
