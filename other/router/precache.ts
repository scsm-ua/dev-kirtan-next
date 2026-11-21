import { useEffect } from 'react';

import { ensureBook, getCacheStatus, setCurrentBook } from '@/other/offline/cacheStatus';
import { isServiceWorkerEnabled } from '@/other/offline/serviceWorkerEnabled';

/** Delay before precaching when the browser has no idle callback (Safari). */
const FALLBACK_DELAY_MS = 3000;

let isPersistRequested = false;

/** Once a book is cached, asks the browser to keep the cache (less likely to be evicted). */
function requestPersistence(bookId: string): void {
  if (isPersistRequested || getCacheStatus().books[bookId]?.state !== 'cached') return;
  isPersistRequested = true;
  navigator.storage?.persist?.().catch(() => {});
}

/**
 * Asks the service worker, when the browser is idle, to make sure the
 * songbook is fully cached; on every session and every book change. The
 * worker fetches only what is missing, so a cached book costs no traffic.
 * The book is also registered in the status store, which ensures it again
 * when a new worker takes over. Skipped without a book id (the songbook
 * list) and when the worker is off (`isServiceWorkerEnabled`).
 */
export function usePrecacheBook(bookId: string | undefined): void {
  useEffect(() => {
    if (!bookId || !isServiceWorkerEnabled()) return;

    setCurrentBook(bookId);
    let isCancelled = false;
    const run = () => {
      if (isCancelled) return;
      ensureBook(bookId).then(() => requestPersistence(bookId));
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 10000 });
      return () => {
        isCancelled = true;
        setCurrentBook(undefined);
        window.cancelIdleCallback(id);
      };
    }
    const timer = setTimeout(run, FALLBACK_DELAY_MS);
    return () => {
      isCancelled = true;
      setCurrentBook(undefined);
      clearTimeout(timer);
    };
  }, [bookId]);
}
