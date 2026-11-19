ALTER TYPE "PointEvent" ADD VALUE 'MISSION_COMPLETED';

ALTER TABLE "PointEntry" ADD CONSTRAINT "PointEntry_mission_reward_check" CHECK (
    "event"::text <> 'MISSION_COMPLETED'
    OR ("outcome" = 'AWARDED' AND "points" BETWEEN 0 AND 1000 AND "xp" BETWEEN 0 AND 1000 AND ("points" > 0 OR "xp" > 0))
);

CREATE TABLE "MissionProgress" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "missionKey" VARCHAR(64) NOT NULL,
    "completedSteps" INTEGER NOT NULL,
    "stepCount" INTEGER NOT NULL,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "MissionProgress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MissionProgress_counts_check" CHECK (
        "stepCount" BETWEEN 0 AND 99
        AND (
            ("completedAt" IS NULL AND "completedSteps" BETWEEN 0 AND 9 AND ("completedSteps" > 0 OR "stepCount" > 0))
            OR ("completedAt" IS NOT NULL AND "completedSteps" BETWEEN 2 AND 10 AND "stepCount" = 0)
        )
    )
);

CREATE UNIQUE INDEX "MissionProgress_accountId_missionKey_key" ON "MissionProgress"("accountId", "missionKey");

ALTER TABLE "MissionProgress" ADD CONSTRAINT "MissionProgress_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
