ALTER TYPE "PointEvent" ADD VALUE 'REWARD_REDEEMED';

ALTER TABLE "PointEntry" ADD CONSTRAINT "PointEntry_reward_debit_check" CHECK (
    "event"::text <> 'REWARD_REDEEMED'
    OR ("outcome" = 'AWARDED' AND "points" BETWEEN -1000000 AND -1 AND "xp" = 0)
);

CREATE TABLE "RewardRedemption" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "rewardKey" VARCHAR(64) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "cost" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RewardRedemption_cost_check" CHECK ("cost" BETWEEN 1 AND 1000000)
);

CREATE UNIQUE INDEX "RewardRedemption_accountId_requestId_key" ON "RewardRedemption"("accountId", "requestId");
CREATE INDEX "RewardRedemption_accountId_createdAt_id_idx" ON "RewardRedemption"("accountId", "createdAt", "id");

ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
