-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PointEvent" ADD VALUE 'POST_PUBLISHED';
ALTER TYPE "PointEvent" ADD VALUE 'LESSON_COMPLETED';

-- CreateTable
CREATE TABLE "ServiceOffering" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "demoKey" VARCHAR(64),

    CONSTRAINT "ServiceOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSlot" (
    "id" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ServiceSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "demoKey" VARCHAR(64),

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" VARCHAR(600) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReaction" (
    "postId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("postId","accountId")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "body" VARCHAR(3000) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCompletion" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationTurn" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "prompt" VARCHAR(1000) NOT NULL,
    "reply" VARCHAR(2000) NOT NULL,
    "topic" VARCHAR(20) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOffering_demoKey_key" ON "ServiceOffering"("demoKey");

-- CreateIndex
CREATE INDEX "ServiceSlot_startsAt_idx" ON "ServiceSlot"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSlot_serviceId_startsAt_key" ON "ServiceSlot"("serviceId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_slotId_key" ON "Appointment"("slotId");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPost_demoKey_key" ON "CommunityPost"("demoKey");

-- CreateIndex
CREATE INDEX "CommunityPost_createdAt_id_idx" ON "CommunityPost"("createdAt", "id");

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_createdAt_id_idx" ON "CommunityComment"("postId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_courseId_position_key" ON "Lesson"("courseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletion_accountId_lessonId_key" ON "LessonCompletion"("accountId", "lessonId");

-- CreateIndex
CREATE INDEX "Conversation_accountId_updatedAt_id_idx" ON "Conversation"("accountId", "updatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTurn_conversationId_requestId_key" ON "ConversationTurn"("conversationId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTurn_conversationId_position_key" ON "ConversationTurn"("conversationId", "position");

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSlot" ADD CONSTRAINT "ServiceSlot_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ServiceSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

