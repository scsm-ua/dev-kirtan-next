import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FALLBACK_DELAY_MS = 3000;

type TPort = { onmessage: ((e: { data: unknown }) => void) | null };

/** The worker's side of the conversation: what it was sent, and a way to answer. */
let postMessage: ReturnType<typeof vi.fn>;
let channels: Array<{ port1: TPort; port2: object }>;
let persist: ReturnType<typeof vi.fn>;
/** The `navigator.serviceWorker` of the test: a real event target, so `controllerchange` can be dispatched. */
let container: EventTarget & { ready: Promise<unknown> };

/** Lets the `serviceWorker.ready` promise and its `then` run. */
const flush = () => vi.advanceTimersByTimeAsync(0);

/** The hook and the store keep state in their modules, so every test loads fresh copies. */
async function loadHook() {
  vi.resetModules();
  return (await import('@/other/router/precache')).usePrecacheBook;
}

/** Answers the last request with the final status of a run. */
const reply = (status: object) => channels.at(-1).port1.onmessage({ data: status });

beforeEach(() => {
  vi.useFakeTimers();
  postMessage = vi.fn();
  channels = [];
  persist = vi.fn(() => Promise.resolve(true));

  container = Object.assign(new EventTarget(), { ready: Promise.resolve({ active: { postMessage } }) });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist } });
  vi.stubGlobal(
    'MessageChannel',
    class {
      port1: TPort = { onmessage: null };
      port2 = {};

      constructor() {
        channels.push(this);
      }
    }
  );
});

afterEach(() => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  delete (navigator as { connection?: unknown }).connection;
  delete (navigator as { storage?: unknown }).storage;
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('usePrecacheBook', () => {
  it('asks the worker to ensure the book, once the browser had time to settle', async () => {
    const usePrecacheBook = await loadHook();

    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS - 1);
    expect(postMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'ENSURE_BOOK', bookId: 'en' }, [channels[0].port2]);
  });

  it('asks the worker in development too', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const usePrecacheBook = await loadHook();

    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    expect(postMessage).toHaveBeenCalledOnce();
  });

  it('uses the idle callback of the browser when there is one', async () => {
    const usePrecacheBook = await loadHook();
    const requestIdleCallback = vi.fn((run: () => void) => {
      run();
      return 1;
    });
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback);

    const { unmount } = renderHook(() => usePrecacheBook('en'));
    await flush();
    unmount();

    expect(requestIdleCallback).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledOnce();
    expect(cancelIdleCallback).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('asks again on every mount: the worker decides what is missing', async () => {
    const usePrecacheBook = await loadHook();

    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    reply({ bookId: 'en', pages: true, state: 'cached' });
    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    expect(postMessage).toHaveBeenCalledTimes(2);
  });

  it('registers the book of the page: it is ensured again when a new worker takes over', async () => {
    const usePrecacheBook = await loadHook();
    const { unmount } = renderHook(() => usePrecacheBook('en'));

    container.dispatchEvent(new Event('controllerchange'));
    await flush();
    reply({ build: 'new', books: {} });
    await flush();
    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual(['GET_CACHE_STATUS', 'ENSURE_BOOK']);
    expect(postMessage.mock.lastCall[0]).toEqual({ type: 'ENSURE_BOOK', bookId: 'en' });

    // After the page left the book, a worker change ensures nothing.
    unmount();
    container.dispatchEvent(new Event('controllerchange'));
    await flush();
    reply({ build: 'new', books: {} });
    await flush();
    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([
      'GET_CACHE_STATUS',
      'ENSURE_BOOK',
      'GET_CACHE_STATUS'
    ]);
  });

  it('ensures the next book when the user switches books', async () => {
    const usePrecacheBook = await loadHook();
    const { rerender } = renderHook(({ bookId }) => usePrecacheBook(bookId), {
      initialProps: { bookId: 'en' }
    });
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    rerender({ bookId: 'ua' });
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    expect(postMessage.mock.calls.map(([message]) => message.bookId)).toEqual(['en', 'ua']);
  });

  it('asks the browser once to keep the cache, after a book is cached', async () => {
    const usePrecacheBook = await loadHook();

    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    reply({ bookId: 'en', pages: false, state: 'error', error: 'QuotaExceededError' });
    await flush();
    expect(persist).not.toHaveBeenCalled();

    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    reply({ bookId: 'en', pages: true, state: 'none' });
    await flush();
    expect(persist).not.toHaveBeenCalled();

    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    reply({ bookId: 'en', pages: true, state: 'cached' });
    await flush();
    renderHook(() => usePrecacheBook('ua'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    reply({ bookId: 'ua', pages: true, state: 'cached' });
    await flush();

    expect(persist).toHaveBeenCalledOnce();
  });

  it('does not ask after the page was left before the delay passed', async () => {
    const usePrecacheBook = await loadHook();
    const { unmount } = renderHook(() => usePrecacheBook('en'));

    unmount();
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    expect(postMessage).not.toHaveBeenCalled();
  });

  it.each([
    ['there is no book (the songbook list)', () => {}, undefined],
    ['the browser has no service workers', () => delete (navigator as { serviceWorker?: unknown }).serviceWorker, 'en'],
    ['the env prevents the worker', () => vi.stubEnv('NEXT_PUBLIC_PREVENT_SERVICE_WORKER', 'true'), 'en'],
    [
      'no worker is active yet',
      () =>
        Object.defineProperty(navigator, 'serviceWorker', {
          configurable: true,
          value: Object.assign(new EventTarget(), { ready: Promise.resolve({ active: null }) })
        }),
      'en'
    ]
  ])('does nothing when %s', async (_name, arrange, bookId) => {
    arrange();
    const usePrecacheBook = await loadHook();

    renderHook(() => usePrecacheBook(bookId));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    expect(postMessage).not.toHaveBeenCalled();
  });
});
