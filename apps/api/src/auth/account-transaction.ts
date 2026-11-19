import { UnauthorizedException } from '@nestjs/common';
import type { AccountAuditEvent, Prisma } from '../generated/prisma/client.js';

export async function lockAccount(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${id}::uuid FOR UPDATE`;
  return tx.account.findUnique({ where: { id } });
}

export async function activeAccount(tx: Prisma.TransactionClient, id: string) {
  const account = await lockAccount(tx, id);
  if (!account || account.suspendedAt) throw new UnauthorizedException();
  return account;
}

export function auditAccount(
  tx: Prisma.TransactionClient,
  event: AccountAuditEvent,
  accountId: string,
  actorId?: string,
) {
  return tx.accountAudit.create({ data: { event, accountId, actorId } });
}
