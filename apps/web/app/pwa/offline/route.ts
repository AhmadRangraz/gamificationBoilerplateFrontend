import { forgeConfig } from '@forge/config';
import { offlineDocument } from '../../../lib/offline-document';

export const dynamic = 'force-static';

export function GET() {
  if (!forgeConfig.pwa.enabled) return new Response(null, { status: 404 });
  return new Response(offlineDocument(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      'Cache-Control': 'no-cache',
    },
  });
}
