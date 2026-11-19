-- AlterEnum
ALTER TYPE "PointEvent" ADD VALUE 'STREAK_PROTECTED';

-- CreateTable
CREATE TABLE "StreakProtection" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "day" CHAR(10) NOT NULL,
    "week" CHAR(10) NOT NULL,

    CONSTRAINT "StreakProtection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreakProtection_accountId_day_key" ON "StreakProtection"("accountId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "StreakProtection_accountId_week_key" ON "StreakProtection"("accountId", "week");

-- AddForeignKey
ALTER TABLE "StreakProtection" ADD CONSTRAINT "StreakProtection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "PointEntry" ADD CHECK (
  "event"::text <> 'STREAK_PROTECTED'
  OR ("outcome" = 'AWARDED' AND "points" BETWEEN -1000 AND -1 AND "xp" = 0)
);
