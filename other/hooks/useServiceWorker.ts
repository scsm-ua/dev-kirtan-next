'use client';

import { useEffect } from 'react';

import { getBuildId } from '@/other/router/buildId';

// Prevent service worker registration if this env is set to 'true'
const PREVENT_SW = process.env.NEXT_PUBLIC_PREVENT_SERVICE_WORKER === 'true';

/**
 * Register service worker for PWA functionality
 */
export function useServiceWorker() {
  useEffect(() => {
    if (PREVENT_SW) {
      console.log('Service Worker registration prevented by env');
      return;
    }
    if ('serviceWorker' in navigator) {
      // Page data is cached per build, and a rebuild can change data without a new commit.
      const swUrl = `/sw.js?v=${encodeURIComponent(getBuildId())}`;

      navigator.serviceWorker
        .register(swUrl, { scope: '/' })
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);
}
