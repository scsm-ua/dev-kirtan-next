/**
 * The one switch for the service worker and everything that talks to it
 * (registration, cache status store, precache): on in every browser with
 * service workers, unless `NEXT_PUBLIC_PREVENT_SERVICE_WORKER=true`.
 */
export function isServiceWorkerEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PREVENT_SERVICE_WORKER === 'true') return false;
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}
