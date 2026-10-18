// Tracks whether the service worker has finished caching the app shell.
// Kept separate from registerPWA.js so components (and tests) can read the
// status without importing the build-time "virtual:pwa-register" module.
//
// Readiness is never remembered in storage: it is true only while a real
// service worker controls the page or has just reported "offline ready".
import { useEffect, useState } from 'react';

const listeners = new Set();
let ready = false;

export function markOfflineReady() {
  ready = true;
  listeners.forEach((listener) => listener(true));
}

export function isOfflineReady() {
  const controlled = typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller);
  return ready || controlled;
}

export function useOfflineReady() {
  const [value, setValue] = useState(isOfflineReady);
  useEffect(() => {
    listeners.add(setValue);
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    const onControllerChange = () => setValue(isOfflineReady());
    sw?.addEventListener?.('controllerchange', onControllerChange);
    return () => {
      listeners.delete(setValue);
      sw?.removeEventListener?.('controllerchange', onControllerChange);
    };
  }, []);
  return value;
}
