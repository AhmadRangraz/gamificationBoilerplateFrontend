import { forgeConfig } from '@forge/config';
import { pwaAssets } from '../../lib/pwa-assets';

export const dynamic = 'force-static';

export function GET() {
  const { project, locale, pwa } = forgeConfig;
  if (!pwa.enabled) return new Response(null, { status: 404 });

  return Response.json(
    {
      id: '/',
      name: project.name,
      short_name: pwa.shortName ?? project.name,
      description: project.description,
      lang: locale,
      dir: 'rtl',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: pwa.themeColor,
      background_color: pwa.backgroundColor,
      icons: [
        {
          src: pwaAssets.icon192,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: pwaAssets.icon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: pwaAssets.maskable,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    },
  );
}
