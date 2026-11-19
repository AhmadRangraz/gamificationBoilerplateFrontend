import { apiPrefix, forgeConfig, resolveApiOrigin } from '@forge/config';
import type { NextConfig } from 'next';
import { presetRoutes } from './lib/preset-copy';

const apiOrigin = resolveApiOrigin(forgeConfig, process.env.FORGE_API_ORIGIN);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@forge/ui'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        ...Object.entries(presetRoutes).flatMap(([key, { href }]) =>
          forgeConfig.features[key as keyof typeof presetRoutes]
            ? []
            : [{ source: `${href}/:path*`, destination: '/forge-unavailable' }],
        ),
        ...(!forgeConfig.features.gamification
          ? [
              { source: '/progress/:path*', destination: '/forge-unavailable' },
              {
                source: '/admin/points/:path*',
                destination: '/forge-unavailable',
              },
              {
                source: '/admin/gamification',
                destination: '/forge-unavailable',
              },
            ]
          : []),
        ...(!forgeConfig.features.marketplace
          ? [
              {
                source: '/marketplace/:path*',
                destination: '/forge-unavailable',
              },
            ]
          : []),
        ...(!forgeConfig.features.workspaceAdmin
          ? [
              {
                source: '/admin/workspaces/:path*',
                destination: '/forge-unavailable',
              },
            ]
          : []),
      ],
      afterFiles: [
        {
          source: `/${apiPrefix}/:path*`,
          destination: `${apiOrigin}/${apiPrefix}/:path*`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
