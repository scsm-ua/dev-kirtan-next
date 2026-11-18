import { afterAll, describe, expect, it, vi } from 'vitest';

import sitemap from '@/app/sitemap';
import { getSingers } from '@/lib/audio';
import { getSongbookPath } from '@/other/paths';
import { getBooksMap, getItems } from '@/tests/helpers/books';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN;
const books = Object.entries(getBooksMap());
const visibleBookIds = books.filter(([, book]) => !book.hidden).map(([bookId]) => bookId);

describe('sitemap', async () => {
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);
  const paths = new Set(urls.map((url) => url.slice(ORIGIN.length - 1)));

  it('lists absolute URLs of this site that end with a slash', () => {
    expect(urls.filter((url) => !url.startsWith(ORIGIN) || !url.endsWith('/'))).toEqual([]);
  });

  it('gives every entry a priority and a change frequency', () => {
    const incomplete = entries.filter(
      (entry) => !(entry.priority > 0 && entry.priority <= 1) || !entry.changeFrequency
    );

    expect(incomplete.map((entry) => entry.url)).toEqual([]);
  });

  it.each(visibleBookIds)('has the root pages, the audio pages and every item of %s', (bookId) => {
    const singers = getSingers(bookId);
    const expected = [
      `/${bookId}/`,
      `/${bookId}/other/`,
      `/${bookId}/contents/`,
      `/${bookId}/a-z/`,
      `/${bookId}/authors/`,
      ...(singers.length ? [`/${bookId}/audio/`] : []),
      ...singers.map((singer) => `/${bookId}/audio/${singer.id}/`),
      ...getItems(bookId).map((item) => `/${bookId}/${item.id}/`)
    ];

    expect(expected.filter((path) => !paths.has(path))).toEqual([]);
  });

  it('has no pages from hidden books', () => {
    const hiddenBookPaths = books
      .filter(([, book]) => book.hidden)
      .map(([bookId]) => getSongbookPath(bookId));

    expect([...paths].filter((path) => hiddenBookPaths.some((prefix) => path.startsWith(prefix))))
      .toEqual([]);
  });

  it('has no search, export or analyze pages', () => {
    const unwanted = [...paths].filter(
      (path) => /^\/[^/]+\/(search|export|analyze)\/$/.test(path)
    );

    expect(unwanted).toEqual([]);
  });

  it('lists every URL once', () => {
    expect(urls.filter((url, i) => urls.indexOf(url) !== i)).toEqual([]);
  });
});
