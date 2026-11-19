import 'server-only';
import { createForgeClient } from '@forge/api-client';
import { apiPrefix, forgeConfig, resolveApiOrigin } from '@forge/config';
import { z } from 'zod';

export const healthPath = `/${apiPrefix}/health` as const;

const healthSchema = z.union([
  z.object({ status: z.literal('ready'), database: z.literal('ready') }),
  z.object({
    status: z.literal('unavailable'),
    database: z.literal('unavailable'),
  }),
]);

export type SystemStatus =
  | { api: 'ready'; database: 'ready' | 'unavailable' }
  | { api: 'unavailable'; database: 'unknown' };

export async function readStatus(): Promise<SystemStatus> {
  const unreachable = { api: 'unavailable', database: 'unknown' } as const;
  const origin = resolveApiOrigin(forgeConfig, process.env.FORGE_API_ORIGIN);

  try {
    const { data, error, response } = await createForgeClient(origin).GET(
      healthPath,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(4_000),
      },
    );
    const result = healthSchema.safeParse(data ?? error);
    if (!result.success) return unreachable;

    if (response.status === 200 && result.data.status === 'ready') {
      return { api: 'ready', database: 'ready' };
    }
    if (response.status === 503 && result.data.status === 'unavailable') {
      return { api: 'ready', database: 'unavailable' };
    }

    return unreachable;
  } catch {
    return unreachable;
  }
}
