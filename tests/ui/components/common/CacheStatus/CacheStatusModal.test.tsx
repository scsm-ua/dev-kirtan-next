import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translate } from '@/other/i18n';
import { getBookIds } from '@/tests/helpers/books';

import type { TBookCacheInfo, TBookCacheStatus } from '@/types/offline';
import type { TCacheStatusState } from '@/other/offline/cacheStatus';

let state: TCacheStatusState;
let notify: () => void;
let isOnline: boolean;
const getBookCacheInfo = vi.fn<(bookId: string) => Promise<TBookCacheInfo>>();

vi.mock('@/other/offline/cacheStatus', () => ({
  getBookCacheInfo: (bookId: string) => getBookCacheInfo(bookId),
  getCacheStatus: () => state,
  subscribeCacheStatus: (listener: () => void) => {
    notify = listener;
    return () => {};
  }
}));
vi.mock('@/other/hooks/useIsOnline', () => ({ useIsOnline: () => isOnline }));

const { default: CacheStatusModal, formatBytes, formatGroup } = await import('@/components/common/CacheStatus/CacheStatusModal');

const INFO: TBookCacheInfo = {
  bookId: 'en',
  pages: 412,
  texts: { bytes: 1.6 * 1024 * 1024, count: 2 },
  bookImages: { bytes: 512 * 1024, count: 6, total: 19 },
  appImages: { bytes: 1024 * 1024, count: 30, total: 30 },
  appResources: { bytes: 900 * 1024, count: 18 },
  appHtml: { bytes: 40 * 1024, count: 3 },
  bookTotalBytes: 4.8 * 1024 * 1024,
  allTotalBytes: 7.2 * 1024 * 1024
};
const ROWS = {
  texts: '412 · 1.6 MB',
  bookImages: '6 / 19 · 512.0 KB',
  appImages: '30 · 1.0 MB',
  appResources: '18 · 900.0 KB',
  appHtml: '3 · 40.0 KB',
  bookTotal: '4.8 MB',
  allTotal: '7.2 MB'
};
const BOOK_ROWS = Object.fromEntries(Object.entries(ROWS).filter(([key]) => key !== 'allTotal'));
// The all-songbooks total waits for the reply: it may be hidden.
const PENDING_ROWS = Object.fromEntries(Object.keys(BOOK_ROWS).map((key) => [key, '…']));
const CACHED: TBookCacheStatus = {
  bookId: 'en',
  pages: true,
  state: 'cached',
  images: { cached: 30, total: 30 },
  contentImages: { cached: 6, total: 19 }
};

const setBook = (status: TBookCacheStatus) => {
  state = { isAvailable: true, books: { [status.bookId]: status } };
};
const stateLine = () => screen.getByRole('dialog').querySelector('.AppModal__title');
const rows = () =>
  Object.fromEntries(
    [...document.querySelectorAll('.CacheStatusModal__row')].map((row) => [
      row.getAttribute('data-row'),
      row.querySelector('dd').textContent
    ])
  );

/** Renders the open popup and lets the reply of the worker arrive. */
async function open(bookId = 'en') {
  const view = render(<CacheStatusModal bookId={bookId} isOpen onClose={() => {}} />);
  await act(async () => {});
  return view;
}

beforeEach(() => {
  state = { isAvailable: true, books: {} };
  isOnline = true;
  getBookCacheInfo.mockReset().mockResolvedValue(INFO);
});

describe('CacheStatusModal', () => {
  it('is not shown while closed, and asks the worker nothing', () => {
    setBook(CACHED);
    render(<CacheStatusModal bookId="en" isOpen={false} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getBookCacheInfo).not.toHaveBeenCalled();
  });

  it('shows a cached book: green dot, state line, sizes and counts', async () => {
    setBook(CACHED);
    await open();

    expect(stateLine().textContent).toBe(translate('en', 'OFFLINE.AVAILABLE'));
    expect(stateLine().querySelector('.CacheLed').getAttribute('data-status')).toBe('cached');
    expect(document.querySelector('[role="progressbar"]')).toBeNull();
    expect(getBookCacheInfo).toHaveBeenCalledExactlyOnceWith('en');
    // Songbook images: some skipped, e.g. on Save-Data.
    expect(rows()).toEqual(ROWS);
  });

  it('shows "…" until the worker answers', () => {
    setBook(CACHED);
    getBookCacheInfo.mockReturnValue(new Promise(() => {}));
    render(<CacheStatusModal bookId="en" isOpen onClose={() => {}} />);

    expect(rows()).toEqual(PENDING_ROWS);
  });

  it('hides the all-songbooks total when it shows the same size as the songbook total', async () => {
    setBook(CACHED);
    getBookCacheInfo.mockResolvedValue({ ...INFO, allTotalBytes: INFO.bookTotalBytes + 10 });
    await open();

    expect(rows()).toEqual(BOOK_ROWS);
  });

  it('shows only the state line for a book that is not saved', async () => {
    await open();

    expect(stateLine().textContent).toBe(translate('en', 'OFFLINE.NOT_SAVED'));
    expect(stateLine().querySelector('.CacheLed').getAttribute('data-status')).toBe('none');
    expect(rows()).toEqual({});
    expect(getBookCacheInfo).not.toHaveBeenCalled();
  });

  it('shows "not saved" after a failed job', async () => {
    setBook({ bookId: 'en', pages: false, state: 'error', error: 'x' });
    await open();

    expect(stateLine().textContent).toBe(translate('en', 'OFFLINE.NOT_SAVED'));
    expect(stateLine().querySelector('.CacheLed').getAttribute('data-status')).toBe('error');
  });

  it('shows "not saved" and no dot without a service worker', async () => {
    state = { isAvailable: false, books: { en: CACHED } };
    await open();

    expect(stateLine().textContent).toBe(translate('en', 'OFFLINE.NOT_SAVED'));
    expect(stateLine().querySelector('.CacheLed')).toBeNull();
  });

  it('shows 0 % while saving before the first progress report', async () => {
    setBook({ bookId: 'en', pages: false, state: 'caching' });
    await open();

    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    expect(rows()).toEqual({});
  });

  it('shows the progress while saving, and asks for the details again when the book is cached', async () => {
    setBook({ bookId: 'en', pages: true, state: 'caching', progress: 0.62 });
    await open();

    expect(stateLine().textContent).toBe(translate('en', 'OFFLINE.SAVING'));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('62');
    expect(document.querySelector('.CacheStatusModal__percent').textContent).toBe('62 %');
    expect(getBookCacheInfo).toHaveBeenCalledTimes(1);

    await act(async () => {
      setBook(CACHED);
      notify();
    });

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(rows()).toEqual(ROWS);
    expect(getBookCacheInfo).toHaveBeenCalledTimes(2);
  });

  it('adds the "Offline" note when there is no network, and keeps the counts', async () => {
    setBook(CACHED);
    isOnline = false;
    await open();

    expect(screen.getByRole('status').textContent).toBe(translate('en', 'FEEDBACK.OFFLINE'));
    expect(stateLine().textContent).toBe(translate('en', 'OFFLINE.AVAILABLE'));
    expect(rows().texts).toBe('412 · 1.6 MB');
  });

  it('has no "Offline" note while online', async () => {
    setBook(CACHED);
    await open();

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does not show the details of another book', async () => {
    setBook({ ...CACHED, bookId: 'ru' });
    getBookCacheInfo.mockResolvedValue(INFO); // A late reply for `en`.
    await open('ru');

    expect(rows().texts).toBe('…');
  });

  it.each(getBookIds())('has every label in the language of the book: %s', async (bookId) => {
    setBook({ ...CACHED, bookId });
    getBookCacheInfo.mockResolvedValue({ ...INFO, bookId });
    await open(bookId);
    const labels = [...document.querySelectorAll('.CacheStatusModal__label')].map((dt) => dt.textContent);

    expect(labels).toEqual(
      ['TEXTS', 'BOOK_IMAGES', 'APP_IMAGES', 'APP_RESOURCES', 'APP_HTML', 'BOOK_TOTAL', 'ALL_TOTAL'].map((key) => translate(bookId, `OFFLINE.${key}`))
    );
    expect(labels.every(Boolean)).toBe(true);
  });
});

describe('formatBytes', () => {
  it.each([
    [0, '0.0 KB'],
    [512, '0.5 KB'],
    [348365, '340.2 KB'],
    [1024 * 1024, '1.0 MB'],
    [5033165, '4.8 MB']
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe('formatGroup', () => {
  it('shows the count and the size', () => {
    expect(formatGroup({ bytes: 2048, count: 3 })).toBe('3 · 2.0 KB');
  });

  it('shows cached / listed for images', () => {
    expect(formatGroup({ bytes: 1024 * 1024, count: 0, total: 19 })).toBe('0 / 19 · 1.0 MB');
  });

  it('shows one count for images when all are cached', () => {
    expect(formatGroup({ bytes: 1024, count: 19, total: 19 })).toBe('19 · 1.0 KB');
  });
});
