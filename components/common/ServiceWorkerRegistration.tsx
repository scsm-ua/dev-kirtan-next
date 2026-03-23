'use client';

import { useServiceWorker } from '@/other/hooks/useServiceWorker';

/**
 * Client component to register service worker
 * Must be separate from Layout since Layout is a server component
 */
export function ServiceWorkerRegistration() {
  useServiceWorker();
  return null;
}
