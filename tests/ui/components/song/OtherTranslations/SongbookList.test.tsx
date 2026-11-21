import { render } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSongPath } from '@/other/paths';
import { loadSongPage } from '@/tests/helpers/pageData';

import type { TCacheStatusState } from '@/other/offline/cacheStatus';
import type { TBookCacheStatus } from '@/types/offline';
import type { TPageDataOf } from '@/types/pageData';

let state: TCacheStatusState;
let isOnline: boolean;

vi.mock('@/other/offline/cacheStatus', () => ({
  getCacheStatus: () => state,
  subscribeCacheStatus: () => () => {}
}));
vi.mock('@/other/hooks/useIsOnline', () => ({ useIsOnline: () => isOnline }));

const { default: SongbookList } = await import('@/components/song/OtherTranslations/SongbookList');

let page: TPageDataOf<'song'>;
let otherBooks: string[];

beforeAll(async () => {
  page = await loadSongPage('in-several-books');
  otherBooks = page.data.descriptions
    .filter((description) => !description.hidden && description.slug !== page.route.bookId)
    .map((description) => description.slug);
});

beforeEach(() => {
  isOnline = true;
  state = { isAvailable: true, books: {} };
});

const cached = (bookId: string): TBookCacheStatus => ({ bookId, pages: true, state: 'cached' });

function renderList() {
  const { bookId, slug } = page.route;
  render(<SongbookList bookDescriptions={page.data.descriptions} bookId={bookId} slug={slug} />);
}

const linkedBooks = () =>
  [...document.querySelectorAll<HTMLAnchorElement>('.SongbookList a')].map((link) => link.getAttribute('href'));
const disabledCount = () => document.querySelectorAll('.SongBookItem--disabled').length;

describe('SongbookList offline', () => {
  it('has the song in several books', () => {
    expect(otherBooks.length).toBeGreaterThan(1);
  });

  it('online, links every book, cached or not', () => {
    renderList();
    expect(linkedBooks()).toHaveLength(otherBooks.length + 1);
    expect(disabledCount()).toBe(0);
  });

  it('offline, links only the current book and the books with cached pages', () => {
    isOnline = false;
    const [cachedBook] = otherBooks;
    state.books[cachedBook] = cached(cachedBook);
    renderList();

    const expected = [page.route.bookId, cachedBook].map((bookId) => getSongPath(bookId, page.route.slug));
    expect(linkedBooks().sort()).toEqual(expected.sort());
    expect(disabledCount()).toBe(otherBooks.length - 1);
  });

  it('offline without a service worker, links every book', () => {
    isOnline = false;
    state = { isAvailable: false, books: {} };
    renderList();
    expect(disabledCount()).toBe(0);
  });
});
