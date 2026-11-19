import createClient from 'openapi-fetch';
import type { paths } from './schema';

export function createForgeClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}

export type { components, paths } from './schema';
