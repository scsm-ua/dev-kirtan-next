import { useMemo, useSyncExternalStore } from 'react';

/**
 * Current URL for components outside the page views (footer, hotkeys, page
 * query). Updated on client navigations and on back/forward.
 */
const listeners = new Set<() => void>();

/** Call after changing the URL with `history.pushState` / `replaceState`. */
export function notifyLocationChange(): void {
  listeners.forEach((listener) => listener());
}

/**/
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

const getSnapshot = () => window.location.pathname + window.location.search;
const getServerSnapshot = (): string | null => null;

/** `null` on the server and while hydrating, so the static HTML stays URL-independent. */
export function useAppLocation(): { pathname: string; search: URLSearchParams } | null {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(() => {
    if (value === null) return null;
    const url = new URL(value, 'http://local');
    return { pathname: url.pathname, search: url.searchParams };
  }, [value]);
}
