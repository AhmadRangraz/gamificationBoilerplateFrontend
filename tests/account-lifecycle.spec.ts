import { createHash, randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { dbClient, messagesFor } from './fixtures';

const prefix = '/api/v1/auth';
const headers = { origin: 'http://localhost:3000' };
const password = 'a distinct test passphrase';

test('mock mail supports verification and reset with expiry, replay protection and session revocation', async ({
  request,
}) => {
  const db = await dbClient();
  const email = `forge-lifecycle-${randomUUID()}@example.test`;
  try {
    const register = await request.post(`${prefix}/register`, {
      headers,
      data: { email, name: 'سارا', password },
    });
    expect(register.status()).toBe(201);
    const id: string = (await register.json()).id;
    const verifyRequest = await request.post(`${prefix}/email/request`, {
      headers,
    });
    expect(verifyRequest.status()).toBe(204);

    const verification = (await messagesFor(email)).find(
      (message) => message.kind === 'VERIFY_EMAIL',
    );
    expect(verification?.transport).toBe('mock');
    const verify = () =>
      request.post(`${prefix}/email/verify`, {
        headers,
        data: { code: verification?.code },
      });
    const attempts = await Promise.all([verify(), verify()]);
    expect(attempts.map((response) => response.status()).sort()).toEqual([
      204, 400,
    ]);
    expect(await (await request.get(`${prefix}/me`)).json()).toMatchObject({
      emailVerified: true,
    });

    const resetRequest = () =>
      request.post(`${prefix}/password/request`, { headers, data: { email } });
    expect((await resetRequest()).status()).toBe(204);
    const first = (await messagesFor(email)).find(
      (message) => message.kind === 'RESET_PASSWORD',
    );
    expect(first?.code).toBeTruthy();
    const hash = createHash('sha256').update(first!.code!).digest('hex');
    await db.accountAction.update({
      where: { tokenHash: hash },
      data: { expiresAt: new Date(0) },
    });

    const updatedPassword = `updated ${randomUUID()}`;
    const reset = (code?: string) =>
      request.post(`${prefix}/password/reset`, {
        headers,
        data: { code, password: updatedPassword },
      });
    expect((await reset(first?.code)).status()).toBe(400);
    expect((await resetRequest()).status()).toBe(204);
    const fresh = (await messagesFor(email)).find(
      (message) =>
        message.kind === 'RESET_PASSWORD' && message.code !== first?.code,
    );
    expect((await reset(fresh?.code)).status()).toBe(204);
    expect((await reset(fresh?.code)).status()).toBe(400);
    expect((await request.get(`${prefix}/me`)).status()).toBe(401);
    expect(
      (
        await request.post(`${prefix}/login`, {
          headers,
          data: { email, password },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post(`${prefix}/login`, {
          headers,
          data: { email, password: updatedPassword },
        })
      ).status(),
    ).toBe(200);
    expect(
      await db.accountAudit.count({
        where: { accountId: id, event: 'PASSWORD_RESET' },
      }),
    ).toBe(1);

    const unknown = `unknown-${randomUUID()}@example.test`;
    expect(
      (
        await request.post(`${prefix}/password/request`, {
          headers,
          data: { email: unknown },
        })
      ).status(),
    ).toBe(204);
    expect(await messagesFor(unknown)).toHaveLength(0);
  } finally {
    const account = await db.account.findUnique({
      where: { email },
      select: { id: true },
    });
    if (account)
      await db.accountAudit.deleteMany({ where: { accountId: account.id } });
    await db.account.deleteMany({ where: { email } });
    for (const { path } of await messagesFor(email))
      await rm(path, { force: true });
    await db.$disconnect();
  }
});

test('avatar storage stays local and suspension revokes access with an audit trail', async ({
  request,
  playwright,
}) => {
  const db = await dbClient();
  const memberEmail = `forge-member-${randomUUID()}@example.test`;
  const adminEmail = `forge-admin-${randomUUID()}@example.test`;
  const admin = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
  });
  try {
    const member = await request.post(`${prefix}/register`, {
      headers,
      data: { email: memberEmail, name: 'عضو', password },
    });
    expect(member.status()).toBe(201);
    const id: string = (await member.json()).id;
    const avatarPath = `${prefix}/me/avatar`;
    expect(
      (
        await request.put(avatarPath, { headers, data: { image: 'aGVsbG8=' } })
      ).status(),
    ).toBe(400);
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWNQSXT7j4wZCAoAABUBFXk/gVOWAAAAAElFTkSuQmCC';
    expect(
      (
        await request.put(avatarPath, { headers, data: { image: png } })
      ).status(),
    ).toBe(204);
    const image = await request.get(avatarPath);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toBe('image/png');
    expect(await db.avatar.count({ where: { accountId: id } })).toBe(1);
    expect((await request.delete(avatarPath, { headers })).status()).toBe(204);
    expect((await request.get(avatarPath)).status()).toBe(404);

    const status = `${prefix}/accounts/${id}/status`;
    expect(
      (
        await request.patch(status, { headers, data: { suspended: true } })
      ).status(),
    ).toBe(403);
    expect(
      (
        await admin.post(`${prefix}/register`, {
          headers,
          data: { email: adminEmail, name: 'مدیر', password },
        })
      ).status(),
    ).toBe(201);
    const operator = await db.account.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' },
    });
    expect(
      (
        await admin.patch(status, { headers, data: { suspended: true } })
      ).status(),
    ).toBe(204);
    expect(
      (
        await admin.patch(status, { headers, data: { suspended: true } })
      ).status(),
    ).toBe(204);
    expect((await request.get(`${prefix}/me`)).status()).toBe(401);
    expect(
      (
        await admin.patch(status, { headers, data: { suspended: false } })
      ).status(),
    ).toBe(204);
    expect((await request.get(`${prefix}/me`)).status()).toBe(401);
    expect(
      (
        await request.post(`${prefix}/login`, {
          headers,
          data: { email: memberEmail, password },
        })
      ).status(),
    ).toBe(200);
    expect(
      await db.accountAudit.count({
        where: {
          accountId: id,
          actorId: operator.id,
          event: 'ACCOUNT_SUSPENDED',
        },
      }),
    ).toBe(1);
    expect(
      await db.accountAudit.count({
        where: {
          accountId: id,
          actorId: operator.id,
          event: 'ACCOUNT_RESTORED',
        },
      }),
    ).toBe(1);
  } finally {
    await admin.dispose();
    const accounts = await db.account.findMany({
      where: { email: { in: [memberEmail, adminEmail] } },
      select: { id: true },
    });
    const ids = accounts.map(({ id }) => id);
    await db.accountAudit.deleteMany({ where: { accountId: { in: ids } } });
    await db.account.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
});

test('production rejects the mock mail transport even when explicitly selected', async ({
  request,
}) => {
  const result = await request.post(
    'http://127.0.0.1:4001/api/v1/auth/password/request',
    {
      headers: { origin: 'https://forge.example.test' },
      data: { email: 'demo@example.test' },
    },
  );
  expect(result.status()).toBe(503);
});
