import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

const prefix = '/api/v1/auth';
const origin = 'http://localhost:3000';
const headers = { origin };
const password = 'a distinct test passphrase';

test('same-origin registration, profile, login rotation and logout enforce session and role boundaries', async ({
  request,
}) => {
  const email = `forge-test-${randomUUID()}@example.test`;
  expect((await request.get(`${prefix}/me`)).status()).toBe(401);

  const register = await request.post(`${prefix}/register`, {
    headers,
    data: { email: email.toUpperCase(), name: '  سارا احمدی  ', password },
  });
  expect(register.status()).toBe(201);
  expect(await register.json()).toEqual({
    id: expect.any(String),
    email,
    name: 'سارا احمدی',
    role: 'MEMBER',
    emailVerified: false,
    suspendedAt: null,
  });
  const sessionHeader = register.headers()['set-cookie'];
  expect(sessionHeader).toMatch(/HttpOnly.*SameSite=Strict/);
  expect(register.headers()['cache-control']).toBe('no-store');
  const original = sessionHeader?.split(';')[0] ?? '';

  expect((await request.get(`${prefix}/accounts`)).status()).toBe(403);
  expect(
    (
      await request.patch(`${prefix}/me`, {
        headers: { origin: 'https://untrusted.example' },
        data: { name: 'نام دیگر' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.patch(`${prefix}/me`, {
        headers,
        data: { name: 'سارا', role: 'ADMIN' },
      })
    ).status(),
  ).toBe(400);
  const update = await request.patch(`${prefix}/me`, {
    headers,
    data: { name: 'سارا' },
  });
  expect(update.status()).toBe(200);
  expect(await update.json()).toMatchObject({ name: 'سارا', role: 'MEMBER' });

  const wrong = await request.post(`${prefix}/login`, {
    headers,
    data: { email, password: 'wrong password here' },
  });
  expect(wrong.status()).toBe(401);
  const login = await request.post(`${prefix}/login`, {
    headers,
    data: { email, password },
  });
  expect(login.status()).toBe(200);
  expect(await login.json()).toMatchObject({ email, name: 'سارا' });
  const rotated = login.headers()['set-cookie']?.split(';')[0] ?? '';
  expect(rotated).toMatch(/^forge_session=/);
  expect(rotated).not.toBe(original);
  expect(
    (
      await request.get(`${prefix}/me`, { headers: { cookie: original } })
    ).status(),
  ).toBe(401);

  expect((await request.post(`${prefix}/logout`, { headers })).status()).toBe(
    204,
  );
  expect(
    (
      await request.get(`${prefix}/me`, { headers: { cookie: rotated } })
    ).status(),
  ).toBe(401);
});

test('login limits repeated attempts for a normalized email', async ({
  request,
}) => {
  const email = `forge-limit-${randomUUID()}@example.test`;
  for (let attempt = 0; attempt < 10; attempt++) {
    const invalid = await request.post(`${prefix}/login`, {
      headers,
      data: { email, password },
    });
    expect(invalid.status()).toBe(401);
  }
  const limited = await request.post(`${prefix}/login`, {
    headers,
    data: { email: email.toUpperCase(), password },
  });
  expect(limited.status()).toBe(429);
});
