import { act, render } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { translate } from '@/other/i18n';
import { loadPage } from '@/tests/helpers/pageData';

import type { TBookDescription } from '@/types/book';
import type { TCacheStatusState } from '@/other/offline/cacheStatus';

let state: TCacheStatusState;
let notify: () => void;
let isOnline: boolean;

vi.mock('@/other/offline/cacheStatus', () => ({
  getCacheStatus: () => state,
  subscribeCacheStatus: (listener: () => void) => {
    notify = listener;
    return () => {};
  }
}));

vi.mock('@/other/hooks/useIsOnline', () => ({ useIsOnline: () => isOnline }));

const { default: BookCard } = await import('@/components/home/BookCard/BookCard');

let book: TBookDescription;

beforeAll(async () => {
  book = (await loadPage({ kind: 'book-list', bookId: 'en' }, 'book-list')).data.booksMap.en;
});

beforeEach(() => {
  state = { isAvailable: true, books: {} };
  isOnline = true;
});

const dot = (container: HTMLElement) => container.querySelector('.BookCard__cached .CacheLed');

describe('BookCard offline dot', () => {
  it('has a green dot once the book is cached', () => {
    const { container } = render(<ul><BookCard bookDescription={book} /></ul>);
    expect(dot(container)).toBeNull();

    act(() => {
      state = { isAvailable: true, books: { en: { bookId: 'en', pages: true, state: 'cached' } } };
      notify();
    });

    expect(dot(container).getAttribute('data-status')).toBe('cached');
    expect(dot(container).getAttribute('aria-label')).toBe(translate('en', 'OFFLINE.AVAILABLE'));
  });

  it.each([
    ['while it is being saved', { isAvailable: true, books: { en: { bookId: 'en', pages: true, state: 'caching' } } }],
    ['after a failed job', { isAvailable: true, books: { en: { bookId: 'en', pages: false, state: 'error' } } }],
    ['when another book is cached', { isAvailable: true, books: { ru: { bookId: 'ru', pages: true, state: 'cached' } } }],
    ['without a service worker', { isAvailable: false, books: { en: { bookId: 'en', pages: true, state: 'cached' } } }]
  ] as const)('has no dot %s (no yellow on cards)', (_name, next) => {
    state = next as TCacheStatusState;
    const { container } = render(<ul><BookCard bookDescription={book} /></ul>);

    expect(dot(container)).toBeNull();
  });
});

describe('BookCard offline', () => {
  const link = (container: HTMLElement) => container.querySelector('a.BookCard__link');
  const isGrey = (container: HTMLElement) => !!container.querySelector('.BookCard--disabled');
  const renderCard = () => render(<ul><BookCard bookDescription={book} /></ul>).container;

  it('online, links the book even when it is not cached', () => {
    const container = renderCard();
    expect(link(container)).toBeTruthy();
    expect(isGrey(container)).toBe(false);
  });

  it('offline, greys out a book whose pages are not cached and drops the link', () => {
    isOnline = false;
    state = { isAvailable: true, books: { ru: { bookId: 'ru', pages: true, state: 'cached' } } };
    const container = renderCard();

    expect(link(container)).toBeNull();
    expect(isGrey(container)).toBe(true);
    expect(container.querySelector('.BookCard__link[aria-disabled="true"] .BookCard__title').textContent).toBe(book.title);
  });

  it('offline, links a book whose pages are cached', () => {
    isOnline = false;
    state = { isAvailable: true, books: { en: { bookId: 'en', pages: true, state: 'none' } } };
    const container = renderCard();

    expect(link(container)).toBeTruthy();
    expect(isGrey(container)).toBe(false);
  });

  it('offline without a service worker, links the book', () => {
    isOnline = false;
    state = { isAvailable: false, books: {} };
    expect(link(renderCard())).toBeTruthy();
  });
});
