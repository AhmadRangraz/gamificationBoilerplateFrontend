import { createHash } from 'node:crypto';
import { forgeConfig } from '@forge/config';
import { offlineDocument } from './offline-document';
import { pwaAssets } from './pwa-assets';

const prefix = 'forge-pwa-';
const assets = Object.entries(pwaAssets).map(([key, path]) => [
  path,
  key === 'offline' ? 'text/html' : 'image/png',
]);

const cleanup = `
async function cleanCaches(keep) {
  const names = await caches.keys();
  await Promise.all(names
    .filter((name) => name.startsWith(PREFIX) && name !== keep)
    .map((name) => caches.delete(name)));
}
`;

const enabledWorker = `
const staticAssets = new Map(ASSETS);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const entries = await Promise.all(ASSETS.map(async ([path, type]) => {
      const url = new URL(path, self.location.origin);
      const response = await fetch(url, {
        cache: 'reload', credentials: 'omit', redirect: 'error',
      });
      if (!response.ok || !response.headers.get('content-type')?.startsWith(type)) {
        throw new Error('Invalid PWA asset: ' + path);
      }
      return [url, response];
    }));
    const cache = await caches.open(CACHE);
    await Promise.all(entries.map(([url, response]) => cache.put(url, response)));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await cleanCaches(CACHE);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'FORGE_ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (!url.search && staticAssets.has(url.pathname) && request.mode !== 'navigate') {
    event.respondWith((async () => {
      const response = await caches.match(url, { cacheName: CACHE });
      return response ?? fetch(request);
    })());
    return;
  }

  if (request.mode !== 'navigate' || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  // Only the public offline document is read from cache here. Page responses are never stored.
  event.respondWith((async () => {
    try {
      return await fetch(request, { cache: 'no-store' });
    } catch {
      const offline = await caches.match(new URL(OFFLINE, self.location.origin), { cacheName: CACHE });
      if (!offline) return Response.error();
      return new Response(offline.body, { status: 503, headers: offline.headers });
    }
  })());
});
`;

const retiredWorker = `
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await cleanCaches();
    await self.registration.unregister();
  })());
});
`;

export function serviceWorkerSource() {
  const declarations = `const PREFIX = ${JSON.stringify(prefix)};\n`;
  if (!forgeConfig.pwa.enabled) return declarations + cleanup + retiredWorker;
  const assetList = JSON.stringify(assets);
  const version = createHash('sha256')
    .update(
      [
        forgeConfig.pwa.revision,
        assetList,
        offlineDocument(),
        cleanup,
        enabledWorker,
      ].join('\n'),
    )
    .digest('hex')
    .slice(0, 16);

  return (
    declarations +
    `const CACHE = PREFIX + '${version}';\nconst ASSETS = ${assetList};\nconst OFFLINE = ${JSON.stringify(pwaAssets.offline)};\n` +
    cleanup +
    enabledWorker
  );
}
