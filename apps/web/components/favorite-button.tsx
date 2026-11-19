'use client';

import { Button, Notice } from '@forge/ui';
import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { browserApi, runMutation } from '../lib/browser-api';
import { market } from '../lib/market-copy';

export function FavoriteButton({
  id,
  savedInitially,
}: {
  id: string;
  savedInitially: boolean;
}) {
  const [saved, setSaved] = useState(savedInitially);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function toggle() {
    setBusy(true);
    const api = browserApi();
    const options = { params: { path: { id } } };
    const failure = await runMutation(() =>
      saved
        ? api.DELETE('/api/v1/marketplace/favorites/{id}', options)
        : api.PUT('/api/v1/marketplace/favorites/{id}', options),
    );
    setError(failure ?? undefined);
    if (!failure) setSaved(!saved);
    setBusy(false);
  }

  return (
    <div>
      <Button
        tone={saved ? 'quiet' : 'primary'}
        onClick={toggle}
        disabled={busy}
      >
        <Bookmark size={17} aria-hidden="true" />
        {saved ? market.removeFavorite : market.saveFavorite}
      </Button>
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
