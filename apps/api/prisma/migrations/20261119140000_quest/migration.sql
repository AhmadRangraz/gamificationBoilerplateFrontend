ALTER TYPE "PointEvent" ADD VALUE 'QUEST_COMPLETED';

ALTER TABLE "PointEntry" ADD CONSTRAINT "PointEntry_quest_reward_check" CHECK (
  "event"::text <> 'QUEST_COMPLETED'
  OR ("outcome" = 'AWARDED' AND "points" BETWEEN 0 AND 1000 AND "xp" BETWEEN 0 AND 1000 AND "points" + "xp" > 0)
);

CREATE TABLE "QuestProgress" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "questKey" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "QuestProgress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "QuestProgress_count_check" CHECK ("count" BETWEEN 1 AND 100)
);

CREATE UNIQUE INDEX "QuestProgress_accountId_questKey_key" ON "QuestProgress"("accountId", "questKey");

ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
