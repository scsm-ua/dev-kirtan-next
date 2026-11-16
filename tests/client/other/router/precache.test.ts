import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getBuildId } from '@/other/router/buildId';
import { usePrecacheBook } from '@/other/router/precache';

const MARKER = 'kirtan:precached:en';
const FALLBACK_DELAY_MS = 3000;

type TPort = { onmessage: ((e: { data: unknown }) => void) | null };

/** The worker's side of the conversation: what it was sent, and a way to answer. */
let postMessage: ReturnType<typeof vi.fn>;
let channels: Array<{ port1: TPort; port2: object }>;

/** Lets the `serviceWorker.ready` promise and its `then` run. */
const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  postMessage = vi.fn();
  channels = [];

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ active: { postMessage } }) }
  });
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
  vi.useRealTimers();
});

describe('usePrecacheBook', () => {
  it('asks the worker to cache the book and the offline shell, once the browser had time to settle', async () => {
    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS - 1);
    expect(postMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(postMessage).toHaveBeenCalledExactlyOnceWith(
      { type: 'PRECACHE_BOOK', bundleUrl: '/data/en/bundle.json', shellUrl: '/shell/' },
      [channels[0].port2]
    );
  });

  it('uses the idle callback of the browser when there is one', async () => {
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

  it('remembers the build once the worker confirms, and then does not ask again', async () => {
    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    expect(localStorage.getItem(MARKER)).toBeNull();

    channels[0].port1.onmessage({ data: { ok: true } });
    expect(localStorage.getItem(MARKER)).toBe(getBuildId());

    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    expect(postMessage).toHaveBeenCalledOnce();
  });

  it('asks again after a new build, and remembers nothing when the worker reports a failure', async () => {
    localStorage.setItem(MARKER, 'an-older-build');

    renderHook(() => usePrecacheBook('en'));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    channels[0].port1.onmessage({ data: { ok: false } });

    expect(postMessage).toHaveBeenCalledOnce();
    expect(localStorage.getItem(MARKER)).toBe('an-older-build');
  });

  it('precaches the next book when the user switches books', async () => {
    const { rerender } = renderHook(({ bookId }) => usePrecacheBook(bookId), {
      initialProps: { bookId: 'en' }
    });
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    rerender({ bookId: 'ua' });
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    expect(postMessage.mock.calls.map(([message]) => message.bundleUrl)).toEqual([
      '/data/en/bundle.json',
      '/data/ua/bundle.json'
    ]);
  });

  it('does not ask after the page was left before the delay passed', async () => {
    const { unmount } = renderHook(() => usePrecacheBook('en'));

    unmount();
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    expect(postMessage).not.toHaveBeenCalled();
  });

  it.each([
    ['there is no book', () => {}, undefined],
    ['the browser has no service workers', () => delete (navigator as { serviceWorker?: unknown }).serviceWorker, 'en'],
    [
      'the user asked to save data',
      () => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } }),
      'en'
    ],
    ['the site runs in development', () => vi.stubEnv('NODE_ENV', 'development'), 'en'],
    [
      'no worker is active yet',
      () =>
        Object.defineProperty(navigator, 'serviceWorker', {
          configurable: true,
          value: { ready: Promise.resolve({ active: null }) }
        }),
      'en'
    ]
  ])('does nothing when %s', async (_name, arrange, bookId) => {
    arrange();

    renderHook(() => usePrecacheBook(bookId));
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);

    expect(postMessage).not.toHaveBeenCalled();
  });
});
