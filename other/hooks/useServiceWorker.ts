'use client';

import { useEffect } from 'react';

import { isServiceWorkerEnabled } from '@/other/offline/serviceWorkerEnabled';
import { getBuildId } from '@/other/router/buildId';

/**
 * Register service worker for PWA functionality. When the worker is turned
 * off (`NEXT_PUBLIC_PREVENT_SERVICE_WORKER`), a worker left from an
 * earlier session is unregistered, so it stops serving from its cache.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (!isServiceWorkerEnabled()) {
      console.log('[sw] service worker turned off by env');
      navigator.serviceWorker
        .getRegistrations?.()
        .then((registrations) =>
          registrations.forEach((registration) => {
            console.log('[sw] unregistering a leftover worker');
            registration.unregister();
          })
        )
        .catch(() => {});
      return;
    }

    // Page data is cached per build, and a rebuild can change data without a new commit.
    const swUrl = `/sw.js?v=${encodeURIComponent(getBuildId())}`;

    navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then((registration) => {
        console.log(`[sw] registered for build ${getBuildId()}, scope ${registration.scope}`);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }, []);
}
