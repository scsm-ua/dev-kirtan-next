import { beforeAll, describe, expect, it } from 'vitest';

import { getChrome, getPrefetchPaths, isPrecachePage } from '@/components/app/views/registry';
import { getSingers } from '@/lib/audio';
import { listRoutes, loadPageData } from '@/lib/pageData';
import { parsePath } from '@/other/router/routes';
import { getBookIds, getItems } from '@/tests/helpers/books';
import { findBook } from '@/tests/helpers/cases';
import { loadPage, loadSongPage } from '@/tests/helpers/pageData';

import type { TPageData } from '@/types/pageData';

const [bookId] = getBookIds();

/** One real page of every kind. */
let pages: Array<TPageData>;

beforeAll(async () => {
  const pageBookId = findBook('markdown-pages');
  const { id: pageSlug } = getItems(pageBookId).find((item) => item.type === 'page');
  const audioBookId = getBookIds().find((id) => getSingers(id).length > 0);
  const routes = [
    ...listRoutes(audioBookId).filter((route) => route.kind !== 'item'),
    { kind: 'item', bookId: pageBookId, slug: pageSlug } as const
  ];

  pages = [...(await Promise.all(routes.map((route) => loadPageData(route)))), await loadSongPage('in-several-books')];
});

const pagesOf = (kind: TPageData['kind']) => pages.filter((page) => page.kind === kind);

describe('views registry', () => {
  it('covers a page of every kind', () => {
    expect([...new Set(pages.map((page) => page.kind))].sort()).toEqual(
      ['a-z', 'audio', 'audio-singer', 'authors', 'book-list', 'contents', 'other', 'page', 'search', 'song']
    );
  });

  describe('isPrecachePage', () => {
    it('starts no book caching on the songbook list, and starts it on every other page', () => {
      const without = pages.filter((page) => !isPrecachePage(page)).map((page) => page.kind);

      expect([...new Set(without)]).toEqual(['book-list']);
    });
  });

  describe('getPrefetchPaths', () => {
    it.each(['song', 'page'] as const)('names the previous and next items of a %s, as app paths', (kind) => {
      const [page] = pagesOf(kind) as Array<Extract<TPageData, { kind: 'song' | 'page' }>>;
      const neighbours = Object.values(page.data.nav).flatMap(({ prev, next }) => [prev, next]);
      const expected = neighbours.flatMap((item) => (item ? [item.path] : []));
      const paths = getPrefetchPaths(page);

      expect(paths).toEqual(expected);
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.filter((path) => parsePath(path.split('?')[0])?.kind !== 'item')).toEqual([]);
    });

    it('names nothing for the other kinds', () => {
      const others = pages.filter((page) => page.kind !== 'song' && page.kind !== 'page');

      expect(others.flatMap(getPrefetchPaths)).toEqual([]);
    });
  });

  describe('getChrome', () => {
    it('gives a page without its own rule the book and its kind as the page type', async () => {
      const page = await loadPage({ kind: 'contents', bookId }, 'contents');

      expect(getChrome(page)).toEqual({ bookId, pageType: 'contents' });
    });

    it('gives the songbook list its About link and no cache status', () => {
      const [page] = pagesOf('book-list') as Array<Extract<TPageData, { kind: 'book-list' }>>;

      expect(getChrome(page)).toMatchObject({
        about: page.data.about,
        bookId: page.route.bookId,
        hideCacheStatus: true
      });
    });

    it('tracks every singer page as its own item', () => {
      const singerPages = pagesOf('audio-singer') as Array<Extract<TPageData, { kind: 'audio-singer' }>>;

      expect(singerPages.map((page) => getChrome(page).itemId)).toEqual(
        singerPages.map((page) => page.route.singerId)
      );
    });

    it.each(['song', 'page'] as const)('gives a %s the content page class, its slug and its type', (kind) => {
      const [page] = pagesOf(kind) as Array<Extract<TPageData, { kind: 'song' | 'page' }>>;

      expect(getChrome(page)).toMatchObject({
        bookId: page.route.bookId,
        className: 'ContentPage',
        itemId: page.route.slug,
        pageType: kind
      });
    });
  });
});
