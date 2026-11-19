'use client';

import { Notice } from '@forge/ui';
import { useState } from 'react';
import { browserApi, runMutation } from '../lib/browser-api';
import { progressCopy as copy } from '../lib/progress-copy';

export function RankingPreference({ optedIn }: { optedIn: boolean }) {
  const [enabled, setEnabled] = useState(optedIn);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function change(leaderboardOptIn: boolean) {
    setEnabled(leaderboardOptIn);
    setPending(true);
    setError(undefined);
    const failure = await runMutation(() =>
      browserApi().PATCH('/api/v1/gamification/preferences', {
        body: { leaderboardOptIn },
      }),
    );
    if (failure) {
      setEnabled(!leaderboardOptIn);
      setError(failure);
    }
    setPending(false);
  }

  return (
    <div>
      <label className="action-row">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(event) => change(event.target.checked)}
        />
        {copy.optIn}
      </label>
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
