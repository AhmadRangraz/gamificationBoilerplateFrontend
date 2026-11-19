-- AlterEnum
ALTER TYPE "PointEvent" ADD VALUE 'ADMIN_ADJUSTMENT';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "leaderboardOptIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PointEntry" ADD COLUMN     "actorId" UUID,
ADD COLUMN     "reason" VARCHAR(240);


ALTER TABLE "PointEntry" ADD CONSTRAINT "PointEntry_admin_audit_check" CHECK (
  ("event"::text = 'ADMIN_ADJUSTMENT' AND "actorId" IS NOT NULL AND "reason" IS NOT NULL
    AND length(btrim("reason")) > 0 AND "points" <> 0 AND "xp" = 0 AND "outcome" = 'AWARDED')
  OR ("event"::text <> 'ADMIN_ADJUSTMENT' AND "actorId" IS NULL AND "reason" IS NULL)
);
