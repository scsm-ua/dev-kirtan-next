import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TPort = { onmessage: ((e: { data: unknown }) => void) | null };

let postMessage: ReturnType<typeof vi.fn>;
let channels: Array<{ port1: TPort; port2: object }>;
/** The `navigator.serviceWorker` of the test: a real event target, so messages can be dispatched. */
let container: EventTarget & { ready: Promise<unknown>; startMessages: () => void };

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The store keeps its state in the module, so every test loads a fresh copy. */
async function loadStore() {
  vi.resetModules();
  return import('@/other/offline/cacheStatus');
}

/** The worker answers request `index` (in the order they were sent). */
const reply = (index: number, data: unknown) => channels[index].port1.onmessage({ data });

/** The worker broadcasts a status to every page. */
const broadcast = (status: object) =>
  container.dispatchEvent(new MessageEvent('message', { data: { type: 'BOOK_CACHE_STATUS', status } }));

beforeEach(() => {
  postMessage = vi.fn();
  channels = [];
  container = Object.assign(new EventTarget(), {
    ready: Promise.resolve({ active: { postMessage } }),
    startMessages: vi.fn()
  });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
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
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('cache status store', () => {
  it('is unavailable and asks nothing until someone subscribes', async () => {
    const { getCacheStatus } = await loadStore();
    await flush();

    expect(getCacheStatus()).toEqual({ isAvailable: false, books: {} });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('asks the worker for the state of every book on the first subscriber', async () => {
    const { getCacheStatus, subscribeCacheStatus } = await loadStore();
    const listener = vi.fn();

    subscribeCacheStatus(listener);
    subscribeCacheStatus(() => {});
    await flush();
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'GET_CACHE_STATUS', bookIds: __BOOK_IDS__ }, [channels[0].port2]);

    const books = { en: { bookId: 'en', pages: true, state: 'cached' } };
    reply(0, { build: 'b', books });
    await flush();

    expect(getCacheStatus()).toEqual({ isAvailable: true, books });
    expect(listener).toHaveBeenCalled();
  });

  it('takes the statuses the worker broadcasts, in a new state object', async () => {
    const { getCacheStatus, subscribeCacheStatus } = await loadStore();
    subscribeCacheStatus(() => {});
    await flush();
    reply(0, { build: 'b', books: {} });
    await flush();
    const before = getCacheStatus();

    broadcast({ bookId: 'ua', pages: true, state: 'caching', progress: 0.5 });

    expect(getCacheStatus()).not.toBe(before);
    expect(getCacheStatus().books).toEqual({ ua: { bookId: 'ua', pages: true, state: 'caching', progress: 0.5 } });
  });

  it('replaces the entries with the reply of the worker, which has the counts', async () => {
    const { getCacheStatus, subscribeCacheStatus } = await loadStore();
    subscribeCacheStatus(() => {});
    await flush();
    reply(0, { build: 'b', books: { en: { bookId: 'en', pages: true, state: 'none' } } });
    await flush();

    container.dispatchEvent(new Event('controllerchange'));
    await flush();
    const full = { bookId: 'en', pages: true, state: 'cached', images: { cached: 3, total: 3 } };
    reply(1, { build: 'b', books: { en: full } });
    await flush();

    expect(getCacheStatus().books).toEqual({ en: full });
  });

  it('keeps a status broadcast while the request was on its way, also when the reply differs', async () => {
    const { getCacheStatus, subscribeCacheStatus } = await loadStore();
    subscribeCacheStatus(() => {});
    await flush();
    broadcast({ bookId: 'en', pages: true, state: 'cached' });
    reply(0, { build: 'b', books: { en: { bookId: 'en', pages: true, state: 'caching', progress: 0.9 } } });
    await flush();

    expect(getCacheStatus().books.en.state).toBe('cached');
  });

  it('asks again when a new worker takes over, and forgets books its cache does not have', async () => {
    const { getCacheStatus, subscribeCacheStatus } = await loadStore();
    subscribeCacheStatus(() => {});
    await flush();
    reply(0, { build: 'old', books: { en: { bookId: 'en', pages: true, state: 'cached' } } });
    await flush();

    container.dispatchEvent(new Event('controllerchange'));
    await flush();
    reply(1, { build: 'new', books: {} });
    await flush();

    expect(postMessage).toHaveBeenLastCalledWith({ type: 'GET_CACHE_STATUS', bookIds: __BOOK_IDS__ }, [channels[1].port2]);
    expect(getCacheStatus()).toEqual({ isAvailable: true, books: {} });
    expect(postMessage).toHaveBeenCalledTimes(2);
  });

  it('ensures the current book again when a new worker takes over, after asking for the state', async () => {
    const { setCurrentBook } = await loadStore();
    setCurrentBook('en');
    await flush();
    expect(postMessage).not.toHaveBeenCalled();

    container.dispatchEvent(new Event('controllerchange'));
    await flush();
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'GET_CACHE_STATUS', bookIds: __BOOK_IDS__ }, [channels[0].port2]);
    reply(0, { build: 'new', books: {} });
    await flush();

    expect(postMessage).toHaveBeenLastCalledWith({ type: 'ENSURE_BOOK', bookId: 'en' }, [channels[1].port2]);
  });

  it('ensures no book on a worker change after the page left its book', async () => {
    const { setCurrentBook } = await loadStore();
    setCurrentBook('en');
    setCurrentBook(undefined);

    container.dispatchEvent(new Event('controllerchange'));
    await flush();
    reply(0, { build: 'new', books: {} });
    await flush();

    expect(postMessage).toHaveBeenCalledOnce();
  });

  it('talks to the worker in development too', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { subscribeCacheStatus } = await loadStore();

    subscribeCacheStatus(() => {});
    await flush();

    expect(postMessage).toHaveBeenCalledOnce();
  });

  it.each([
    ['without a service worker', () => delete (navigator as { serviceWorker?: unknown }).serviceWorker],
    ['when the env disables the worker', () => vi.stubEnv('NEXT_PUBLIC_PREVENT_SERVICE_WORKER', 'true')]
  ])('stays unavailable %s', async (_name, arrange) => {
    arrange();
    const { ensureBook, getCacheStatus, subscribeCacheStatus } = await loadStore();

    subscribeCacheStatus(() => {});
    await ensureBook('en');

    expect(getCacheStatus().isAvailable).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });
});

describe('ensureBook', () => {
  it('sends ENSURE_BOOK and stores the final status', async () => {
    const { ensureBook, getCacheStatus } = await loadStore();

    const run = ensureBook('en');
    await flush();
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'ENSURE_BOOK', bookId: 'en' }, [channels[0].port2]);

    const status = { bookId: 'en', pages: true, state: 'cached', images: { cached: 2, total: 5 } };
    reply(0, status);
    await run;

    expect(getCacheStatus()).toEqual({ isAvailable: true, books: { en: status } });
  });
});

describe('getBookCacheInfo', () => {
  it('asks the worker for the details of the book', async () => {
    const { getBookCacheInfo, getCacheStatus } = await loadStore();

    const info = getBookCacheInfo('en');
    await flush();
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'GET_BOOK_CACHE_INFO', bookId: 'en' }, [channels[0].port2]);
    const details = {
      bookId: 'en',
      pages: 3,
      texts: { bytes: 1000, count: 1 },
      bookImages: { bytes: 0, count: 0, total: 0 },
      appImages: { bytes: 100, count: 2, total: 2 },
      appHtml: { bytes: 50, count: 1 },
      appResources: { bytes: 84, count: 2 },
      bookTotalBytes: 1234,
      allTotalBytes: 1234
    };
    reply(0, details);

    expect(await info).toEqual(details);
    expect(getCacheStatus().books).toEqual({});
  });
});
