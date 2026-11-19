import { createForgeClient } from '@forge/api-client';
import { ui } from './account-copy';

export function browserApi() {
  return createForgeClient(window.location.origin);
}

export function apiError(status: number) {
  switch (status) {
    case 400:
      return ui.badRequest;
    case 401:
      return ui.unauthorized;
    case 403:
      return ui.forbidden;
    case 409:
      return ui.conflict;
    case 429:
      return ui.throttled;
    case 503:
      return ui.unavailable;
    default:
      return ui.retry;
  }
}

export async function runMutation(
  action: () => Promise<{ response: Response }>,
) {
  try {
    const { response } = await action();
    return response.ok ? null : apiError(response.status);
  } catch {
    return ui.retry;
  }
}
