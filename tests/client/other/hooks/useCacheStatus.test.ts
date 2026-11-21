import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TCacheStatusState } from '@/other/offline/cacheStatus';

let state: TCacheStatusState;
let notify: () => void;

vi.mock('@/other/offline/cacheStatus', () => ({
  getCacheStatus: () => state,
  subscribeCacheStatus: (listener: () => void) => {
    notify = listener;
    return () => {};
  }
}));

const { useBookCacheState, useCacheStatus } = await import('@/other/hooks/useCacheStatus');

beforeEach(() => {
  state = { isAvailable: false, books: {} };
});

afterEach(() => vi.clearAllMocks());

describe('useCacheStatus', () => {
  it('gives the state of the store and follows its changes', () => {
    const { result } = renderHook(() => useCacheStatus());
    expect(result.current).toBe(state);

    act(() => {
      state = { isAvailable: true, books: { en: { bookId: 'en', pages: true, state: 'cached' } } };
      notify();
    });

    expect(result.current).toBe(state);
  });
});

describe('useBookCacheState', () => {
  it.each([
    ['unavailable', 'without a worker', { isAvailable: false, books: { en: { bookId: 'en', pages: true, state: 'cached' } } }],
    ['none', 'for a book the worker did not report', { isAvailable: true, books: { ua: { bookId: 'ua', pages: true, state: 'cached' } } }],
    // The pages work offline, but the static files were not checked yet: not `cached`.
    ['none', 'with the bundle cached and no status record', { isAvailable: true, books: { en: { bookId: 'en', pages: true, state: 'none' } } }],
    ['caching', 'while a job runs', { isAvailable: true, books: { en: { bookId: 'en', pages: true, state: 'caching', progress: 0.3 } } }],
    ['cached', 'with the bundle and the status record', { isAvailable: true, books: { en: { bookId: 'en', pages: true, state: 'cached' } } }],
    ['error', 'after a failed job', { isAvailable: true, books: { en: { bookId: 'en', pages: false, state: 'error', error: 'x' } } }]
  ] as const)('is %s %s', (expected, _name, next) => {
    state = next as TCacheStatusState;

    expect(renderHook(() => useBookCacheState('en')).result.current).toBe(expected);
  });
});
