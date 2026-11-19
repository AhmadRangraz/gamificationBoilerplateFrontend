'use client';

import { Notice } from '@forge/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ui } from '../lib/account-copy';
import { runMutation } from '../lib/browser-api';

export function usePresetMutation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>();
  async function save(action: () => Promise<{ response: Response }>) {
    setPending(true);
    const result = await runMutation(action);
    setError(result);
    if (!result) router.refresh();
    setPending(false);
  }
  const feedback =
    error === undefined ? null : (
      <Notice error={Boolean(error)}>{error ?? ui.saved}</Notice>
    );
  return { save, pending, feedback };
}
