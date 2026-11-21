import { useSyncExternalStore } from 'react';

import { useIsOnline } from '@/other/hooks/useIsOnline';
import { getCacheStatus, subscribeCacheStatus } from '@/other/offline/cacheStatus';

import type { TCacheStatusState } from '@/other/offline/cacheStatus';
import type { TBookCacheStatus } from '@/types/offline';

export type TBookCacheState = 'unavailable' | TBookCacheStatus['state'];

/** No service worker on the server: no dot in the static HTML, no hydration mismatch. */
const SERVER_STATE: TCacheStatusState = { isAvailable: false, books: {} };
const getServerSnapshot = () => SERVER_STATE;

/** Offline state of all songbooks, shared by all components. */
export function useCacheStatus(): TCacheStatusState {
  return useSyncExternalStore(subscribeCacheStatus, getCacheStatus, getServerSnapshot);
}

/** Offline state of one songbook; `unavailable` without a service worker. */
export function useBookCacheState(bookId: string): TBookCacheState {
  const { isAvailable, books } = useCacheStatus();
  if (!isAvailable) return 'unavailable';
  return books[bookId]?.state ?? 'none';
}

/**
 * Tells whether a songbook can be opened now. Offline, only a book with its
 * bundle cached (`pages`) opens; online or without a worker, every book.
 */
export function useIsBookReachable(): (bookId: string) => boolean {
  const isOnline = useIsOnline();
  const { isAvailable, books } = useCacheStatus();
  return (bookId) => isOnline || !isAvailable || !!books[bookId]?.pages;
}
