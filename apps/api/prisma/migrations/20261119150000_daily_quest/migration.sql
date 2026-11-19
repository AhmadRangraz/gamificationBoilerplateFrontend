ALTER TABLE "QuestProgress" ADD COLUMN "occurrence" VARCHAR(10) NOT NULL DEFAULT 'once';

ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_occurrence_check" CHECK (
    "occurrence" = 'once' OR "occurrence" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
);

CREATE UNIQUE INDEX "QuestProgress_accountId_questKey_occurrence_key" ON "QuestProgress"("accountId", "questKey", "occurrence");
DROP INDEX "QuestProgress_accountId_questKey_key";
