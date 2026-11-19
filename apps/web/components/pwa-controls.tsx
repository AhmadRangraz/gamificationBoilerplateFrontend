'use client';

import { Button } from '@forge/ui';
import { Download, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { pwaCopy } from '../lib/pwa-copy';

interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaControls({ enabled }: { enabled: boolean }) {
  const [prompt, setPrompt] = useState<InstallPrompt>();
  const [waiting, setWaiting] = useState<ServiceWorker>();
  const [updating, setUpdating] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !window.isSecureContext ||
      !('serviceWorker' in navigator)
    )
      return;
    const manager = navigator.serviceWorker;

    if (!enabled) {
      void manager
        .getRegistration('/')
        .then((registration) => {
          const worker =
            registration?.active ??
            registration?.waiting ??
            registration?.installing;
          if (worker?.scriptURL === new URL('/sw.js', location.origin).href)
            return registration?.update();
        })
        .catch(() => undefined);
      return;
    }

    let closed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const watched = new Set<ServiceWorker>();
    function observe() {
      if (closed || !registration) return;
      if (registration.waiting && manager.controller)
        setWaiting(registration.waiting);
      const installing = registration.installing;
      if (installing && !watched.has(installing)) {
        watched.add(installing);
        installing.addEventListener('statechange', observe);
      }
    }
    function controllerChanged() {
      if (requested.current) {
        requested.current = false;
        location.reload();
      } else {
        setWaiting(undefined);
      }
    }
    function capture(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    }
    function installed() {
      setPrompt(undefined);
    }
    function checkForUpdate() {
      if (document.visibilityState === 'visible')
        void registration?.update().catch(() => undefined);
    }
    manager.addEventListener('controllerchange', controllerChanged);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);
    document.addEventListener('visibilitychange', checkForUpdate);

    void manager
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((result) => {
        if (closed) return;
        registration = result;
        registration.addEventListener('updatefound', observe);
        observe();
      })
      .catch(() => undefined);

    return () => {
      closed = true;
      registration?.removeEventListener('updatefound', observe);
      for (const worker of watched)
        worker.removeEventListener('statechange', observe);
      manager.removeEventListener('controllerchange', controllerChanged);
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', installed);
      document.removeEventListener('visibilitychange', checkForUpdate);
    };
  }, [enabled]);

  async function install() {
    if (!prompt) return;
    setPrompt(undefined);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      // A dismissed or unavailable browser prompt can be retried from the browser menu.
    }
  }

  function update() {
    if (!waiting) return;
    requested.current = true;
    setUpdating(true);
    waiting.postMessage('FORGE_ACTIVATE_UPDATE');
    window.setTimeout(() => setUpdating(false), 8000);
  }

  if (!prompt && !waiting) return null;
  return (
    <div className="pwa-actions">
      {prompt && (
        <Button tone="quiet" onClick={install}>
          <Download size={17} aria-hidden="true" />
          {pwaCopy.install}
        </Button>
      )}
      {waiting && (
        <div className="pwa-update">
          <span role="status">{pwaCopy.updateAvailable}</span>
          <Button onClick={update} disabled={updating}>
            <RefreshCw size={16} aria-hidden="true" />
            {updating ? pwaCopy.updating : pwaCopy.update}
          </Button>
        </div>
      )}
    </div>
  );
}
