'use client';

import { useEffect } from 'react';

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
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
          // Wait for service worker to be ready
          return navigator.serviceWorker.ready;
        })
        .then(() => {
          // Send current page URL to service worker for language caching
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CACHE_ALL_BY_LANGUAGE',
              url: window.location.href
            });
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);
}
