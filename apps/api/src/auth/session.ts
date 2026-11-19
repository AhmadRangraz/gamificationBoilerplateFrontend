import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32_768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

const sessionSeconds = 7 * 24 * 60 * 60;

export function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function issueSession() {
  return {
    token: randomBytes(32).toString('base64url'),
    expiresAt: new Date(Date.now() + sessionSeconds * 1000),
  };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored?: string) {
  const [salt, hex] = stored?.split(':') ?? [];
  const selectedSalt = salt ?? '00000000000000000000000000000000';
  const expected = hex ? Buffer.from(hex, 'hex') : Buffer.alloc(64);
  const key = await derive(password, selectedSalt);
  return (
    expected.length === key.length &&
    timingSafeEqual(expected, key) &&
    stored !== undefined
  );
}

export function cookieName() {
  return process.env.NODE_ENV === 'production'
    ? '__Host-forge_session'
    : 'forge_session';
}

export function sessionCookie(token?: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${cookieName()}=${token ?? ''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? sessionSeconds : 0}${secure}`;
}

export function readSession(header?: string) {
  const prefix = `${cookieName()}=`;
  const value = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
