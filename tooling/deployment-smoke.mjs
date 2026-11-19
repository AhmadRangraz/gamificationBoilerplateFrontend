import console from 'node:console';

const [originArgument, option, ...extra] = process.argv.slice(2);
const origin = URL.parse(originArgument ?? '');
const pwaDisabled = option === '--pwa-disabled';
const loopback = ['localhost', '127.0.0.1', '[::1]'];

if (
  !origin ||
  !(
    origin.protocol === 'https:' ||
    (origin.protocol === 'http:' && loopback.includes(origin.hostname))
  ) ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/' ||
  origin.href !== `${origin.origin}/` ||
  (option !== undefined && !pwaDisabled) ||
  extra.length > 0
) {
  console.error(
    'Usage: pnpm ops:smoke <HTTPS origin or loopback HTTP origin> [--pwa-disabled]',
  );
  process.exit(1);
}

async function request(path, expectedStatus, method = 'GET') {
  const response = await globalThis.fetch(new URL(path, origin), {
    method,
    redirect: 'manual',
    signal: globalThis.AbortSignal.timeout(5000),
  });
  if (response.status !== expectedStatus) {
    throw new Error(
      `${path} returned HTTP ${response.status}; expected ${expectedStatus}.`,
    );
  }
  return response;
}

function mediaType(response) {
  return response.headers.get('content-type')?.split(';', 1)[0];
}

try {
  const healthResponse = await request('/api/v1/health', 200);
  const health = await healthResponse.json();
  if (health?.status !== 'ready' || health?.database !== 'ready') {
    throw new Error('The API or PostgreSQL reported an unavailable state.');
  }
  console.log('API and PostgreSQL are ready through the web origin.');

  const statusPage = await request('/status', 200, 'HEAD');
  if (
    mediaType(statusPage) !== 'text/html' ||
    statusPage.headers.get('x-content-type-options') !== 'nosniff' ||
    !statusPage.headers
      .get('content-security-policy')
      ?.includes('frame-ancestors')
  ) {
    throw new Error(
      'The status page is missing HTML or required security headers.',
    );
  }
  console.log('The status page serves HTML with security headers.');

  if (pwaDisabled) {
    await request('/manifest.webmanifest', 404, 'HEAD');
    console.log('The PWA manifest is disabled.');
  } else {
    const manifestResponse = await request('/manifest.webmanifest', 200);
    const manifest = await manifestResponse.json();
    if (
      mediaType(manifestResponse) !== 'application/manifest+json' ||
      manifest?.start_url !== '/' ||
      manifest?.scope !== '/' ||
      manifest?.display !== 'standalone'
    ) {
      throw new Error(
        'The PWA manifest has an unexpected media type or configuration.',
      );
    }
    console.log('The PWA manifest declares a standalone app at the site root.');
  }

  const worker = await request('/sw.js', 200, 'HEAD');
  const directives = worker.headers
    .get('cache-control')
    ?.toLowerCase()
    .split(',')
    .map((directive) => directive.trim());
  if (
    mediaType(worker) !== 'application/javascript' ||
    !directives?.includes('no-store') ||
    worker.headers.get('service-worker-allowed') !== '/'
  ) {
    throw new Error(
      'The service worker is missing its JavaScript, cache, or scope headers.',
    );
  }
  console.log('The service worker allows root scope and forbids HTTP caching.');
} catch (error) {
  console.error(`Deployment smoke failed: ${error.message}`);
  process.exitCode = 1;
}
