-- CreateEnum
CREATE TYPE "AccountActionKind" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "AccountAuditEvent" AS ENUM ('REGISTER', 'LOGIN', 'LOGOUT', 'EMAIL_VERIFIED', 'PASSWORD_RESET', 'ACCOUNT_SUSPENDED', 'ACCOUNT_RESTORED');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AccountAction" (
    "tokenHash" CHAR(64) NOT NULL,
    "kind" "AccountActionKind" NOT NULL,
    "accountId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AccountAction_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "AccountAudit" (
    "id" UUID NOT NULL,
    "event" "AccountAuditEvent" NOT NULL,
    "accountId" UUID NOT NULL,
    "actorId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avatar" (
    "accountId" UUID NOT NULL,
    "image" BYTEA NOT NULL,

    CONSTRAINT "Avatar_pkey" PRIMARY KEY ("accountId")
);

-- CreateIndex
CREATE INDEX "AccountAction_expiresAt_idx" ON "AccountAction"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountAction_accountId_kind_key" ON "AccountAction"("accountId", "kind");

-- CreateIndex
CREATE INDEX "AccountAudit_accountId_createdAt_idx" ON "AccountAudit"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "AccountAction" ADD CONSTRAINT "AccountAction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avatar" ADD CONSTRAINT "Avatar_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

