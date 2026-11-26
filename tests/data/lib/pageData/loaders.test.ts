import { afterAll, describe, expect, it, vi } from 'vitest';

import { getSingers } from '@/lib/audio';
import { loadPageData } from '@/lib/pageData/loaders';
import { getPagesList } from '@/lib/search';
import { ABOUT_PAGE_SLUG, getSongPath } from '@/other/paths';
import { getBookIds, getBooksMap, getItems, readBookFile } from '@/tests/helpers/books';
import { findBook, findSong, getAboutBookId } from '@/tests/helpers/cases';
import { loadPage, loadSongPage } from '@/tests/helpers/pageData';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const [SOME_BOOK] = getBookIds();

describe('loadPageData', () => {
  it.each([
    ['an unknown book', { kind: 'contents', bookId: 'no-such-book' }],
    ['an unknown item', { kind: 'item', bookId: SOME_BOOK, slug: 'no-such-item' }],
    ['an unknown singer', { kind: 'audio-singer', bookId: SOME_BOOK, singerId: 'no-such-singer' }]
  ] as const)('returns null for %s', async (_name, route) => {
    expect(await loadPageData(route)).toBeNull();
  });

  it('gives the book list all books', async () => {
    const page = await loadPage({ kind: 'book-list', bookId: SOME_BOOK }, 'book-list');

    expect(page.data.booksMap).toEqual(getBooksMap());
  });

  it.each(getBookIds())('gives the book list of %s the link to its About page, else to the default one', async (bookId) => {
    const { data } = await loadPage({ kind: 'book-list', bookId }, 'book-list');
    const aboutBookId = getAboutBookId(bookId);

    if (!aboutBookId) return expect(data.about).toBeUndefined();

    // The label is the title the book of the page lists it with.
    expect(data.about).toEqual({
      path: getSongPath(aboutBookId, ABOUT_PAGE_SLUG),
      title: getItems(aboutBookId).find((item) => item.id === ABOUT_PAGE_SLUG).title
    });
    expect(data.about.title).toBeTruthy();
  });

  it('gives the other page all books, no About link and its own canonical path', async () => {
    const page = await loadPage({ kind: 'other', bookId: SOME_BOOK }, 'other');
    expect(page.data.booksMap).toEqual(getBooksMap());
    expect(page.data.about).toBeUndefined();
    expect(page.head.canonical).toContain(`/${SOME_BOOK}/other/`);
  });

  it.each(['contents', 'a-z'] as const)('gives the %s page the groups of its file', async (kind) => {
    const page = await loadPage({ kind, bookId: SOME_BOOK }, kind);

    expect(page.data.book).toEqual(getBooksMap()[SOME_BOOK]);
    expect(page.data.groups).toEqual(readBookFile(SOME_BOOK, `${kind}.json`));
    expect(page.data.hasAudio).toBe(getItems(SOME_BOOK).some((item) => item.has.audio));
  });

  it('gives the search page the page list', async () => {
    const page = await loadPage({ kind: 'search', bookId: SOME_BOOK }, 'search');

    expect(page.data.pages).toEqual(getPagesList(SOME_BOOK));
  });

  it('gives a singer page that singer and only their tracks', async () => {
    const [singer] = getSingers(SOME_BOOK);
    const route = { kind: 'audio-singer', bookId: SOME_BOOK, singerId: singer.id } as const;
    const page = await loadPage(route, 'audio-singer');

    expect(page.data.selected).toEqual(singer);
    expect(page.data.singers).toEqual(getSingers(SOME_BOOK));
    expect(page.data.tracks).toHaveLength(singer.count);
  });

  it('gives a song page the song, its neighbours and the books that have it', async () => {
    const { bookId, slug } = findSong('in-several-books');
    const { data } = await loadSongPage('in-several-books');

    expect(data.song.title.length).toBeGreaterThan(0);
    expect(data.book).toEqual(getBooksMap()[bookId]);
    expect(data.descriptions.map((book) => book.slug)).toContain(bookId);
    expect(data.descriptions.length).toBeGreaterThan(1);
    expect(Object.keys(data.nav).length).toBeGreaterThan(0);
    expect(data.telegraphUrl === null || typeof data.telegraphUrl === 'string').toBe(true);
    expect(getItems(bookId).some((item) => item.id === slug)).toBe(true);
  });

  it('gives a markdown page its body as HTML', async () => {
    const bookId = findBook('markdown-pages');
    const { id: slug } = getItems(bookId).find((item) => item.type === 'page');
    const { data } = await loadPage({ kind: 'item', bookId, slug }, 'page');

    expect(data.page.meta.title).toBeTruthy();
    expect(data.page.bodyHtml).toMatch(/^\s*</);
    expect(data.book).toEqual(getBooksMap()[bookId]);
  });
});
