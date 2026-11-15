import { useEffect } from 'react';

import { getBookBundleUrl, SHELL_PATH } from '@/other/router/routes';
import { getBuildId } from '@/other/router/buildId';

/** Delay before precaching when the browser has no idle callback (Safari). */
const FALLBACK_DELAY_MS = 3000;

// `saveData` (Network Information API) is true when the user enabled "Data Saver" / "Reduce data usage"; not in TS's Navigator type, and absent in Safari/Firefox.
type TNavigator = Navigator & { connection?: { saveData?: boolean } };

/**
 * Asks the service worker to cache every page of the songbook (and the
 * offline shell) once per build, when the browser is idle. Skipped in dev,
 * without a service worker and when the user asked to save data.
 */
export function usePrecacheBook(bookId: string | undefined): void {
  useEffect(() => {
    if (!bookId || process.env.NODE_ENV === 'development') return;
    if (!('serviceWorker' in navigator) || (navigator as TNavigator).connection?.saveData) return;

    const marker = `kirtan:precached:${bookId}`;
    const build = getBuildId();
    if (localStorage.getItem(marker) === build) return;

    let isCancelled = false;
    const run = () => {
      navigator.serviceWorker.ready.then((registration) => {
        if (isCancelled || !registration.active) return;
        const channel = new MessageChannel();
        channel.port1.onmessage = (e) => {
          if (e.data?.ok) localStorage.setItem(marker, build);
        };
        registration.active.postMessage(
          { type: 'PRECACHE_BOOK', bundleUrl: getBookBundleUrl(bookId), shellUrl: SHELL_PATH },
          [channel.port2]
        );
      });
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 10000 });
      return () => {
        isCancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const timer = setTimeout(run, FALLBACK_DELAY_MS);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [bookId]);
}
