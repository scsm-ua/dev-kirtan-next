import { isServiceWorkerEnabled } from '@/other/offline/serviceWorkerEnabled';

import type { TBookCacheInfo, TBookCacheStatus, TCacheStatusReply } from '@/types/offline';

/**
 * Offline state of the songbooks, kept in sync with the service worker
 * (`public/sw.js`). Same pattern as `other/connectivity.ts`: module state,
 * read with `useSyncExternalStore` (`other/hooks/useCacheStatus.ts`).
 */

export type TCacheStatusState = {
  /** false: no service worker (dev, disabled by env, unsupported). */
  isAvailable: boolean;
  books: Record<string, TBookCacheStatus>;
};

const listeners = new Set<() => void>();
let state: TCacheStatusState = { isAvailable: false, books: {} };
let isListening = false;
let isSynced = false;
/** Book of the page on screen (see `setCurrentBook`). */
let currentBookId: string | undefined;
/** Books a broadcast updated while a `GET_CACHE_STATUS` request was on its way. */
let touchedBooks: Set<string> | null = null;

/** Replaces the state (never mutates it), so `useSyncExternalStore` sees the change. */
function setState(next: TCacheStatusState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/**/
function setBook(status: TBookCacheStatus): void {
  touchedBooks?.add(status.bookId);
  setState({ ...state, isAvailable: true, books: { ...state.books, [status.bookId]: status } });
}

/** Sends a message to the active worker and resolves with its reply on a `MessageChannel`. */
async function request<T>(message: object): Promise<T> {
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) throw new Error('No active service worker');

  return new Promise<T>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event: MessageEvent<T>) => resolve(event.data);
    worker.postMessage(message, [channel.port2]);
  });
}

/**
 * Asks the worker for the state of every book; it gets their ids, because
 * it has no list of the songbooks. The reply replaces the entries, except
 * those a broadcast updated in the meantime.
 */
async function refresh(): Promise<void> {
  const touched = (touchedBooks = new Set());
  try {
    const reply = await request<TCacheStatusReply>({ type: 'GET_CACHE_STATUS', bookIds: __BOOK_IDS__ });
    const books = { ...reply.books };
    touched.forEach((bookId) => {
      if (state.books[bookId]) books[bookId] = state.books[bookId];
    });
    setState({ isAvailable: true, books });
  } catch {
    // No active worker: stays unavailable.
  } finally {
    if (touchedBooks === touched) touchedBooks = null;
  }
}

/**/
function onMessage(event: MessageEvent): void {
  if (event.data?.type === 'BOOK_CACHE_STATUS' && event.data.status?.bookId) setBook(event.data.status);
}

/** A new build took over: its cache starts empty, and the old worker may have got the last `ENSURE_BOOK`. */
async function onControllerChange(): Promise<void> {
  console.log('[sw] a new service worker took control: refreshing the cache status', currentBookId ?? '');
  await refresh();
  if (currentBookId) ensureBook(currentBookId);
}

/** Listens to the worker; safe to call again. */
function listen(): boolean {
  if (!isServiceWorkerEnabled()) return false;
  if (isListening) return true;
  isListening = true;

  navigator.serviceWorker.addEventListener('message', onMessage);
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  // Messages wait in a queue until the page starts them.
  navigator.serviceWorker.startMessages?.();
  return true;
}

/** Store API for `useSyncExternalStore`; syncing with the worker starts with the first subscriber. */
export function subscribeCacheStatus(listener: () => void): () => void {
  listeners.add(listener);
  if (listen() && !isSynced) {
    isSynced = true;
    refresh();
  }
  return () => {
    listeners.delete(listener);
  };
}

/**/
export function getCacheStatus(): TCacheStatusState {
  return state;
}

/**
 * Registers the book the worker keeps cached for this page (`undefined`: none,
 * e.g. on the songbook list): it is ensured again when a new worker takes over.
 */
export function setCurrentBook(bookId: string | undefined): void {
  currentBookId = bookId;
  if (bookId) listen();
}

/**
 * Asks the worker to make sure the book is fully cached; it fetches only
 * what is missing (content images are skipped on Save-Data: the worker reads
 * that flag itself). Resolves when the job ends (also on failure); the store
 * then holds the final status.
 */
export async function ensureBook(bookId: string): Promise<void> {
  if (!isServiceWorkerEnabled()) return;
  try {
    const status = await request<TBookCacheStatus>({ type: 'ENSURE_BOOK', bookId });
    if (status?.bookId) setBook(status);
  } catch {
    // No active worker: nothing to do.
  }
}

/**
 * Details of a cached book: bytes it takes in the cache (shared files
 * included), pages, app files. Expensive for the worker (it reads every
 * entry), so it is asked only when the popup opens and not kept in the store.
 */
export function getBookCacheInfo(bookId: string): Promise<TBookCacheInfo> {
  return request<TBookCacheInfo>({ type: 'GET_BOOK_CACHE_INFO', bookId });
}
