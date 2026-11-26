import { afterAll, describe, expect, it, vi } from 'vitest';

import { getAuthorsData } from '@/lib/pageData/routes/authors';
import { translate } from '@/other/i18n';
import { getBookIds, readBookFile } from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';

import type { TItem } from '@/tests/helpers/books';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

describe.each(getBookIds())('getAuthorsData of %s', (bookId) => {
  type TAuthorGroup = { name: string | null; items: TItem[] };

  const source = readBookFile<TAuthorGroup[]>(bookId, 'authors.json');
  const { groups, unknown } = getAuthorsData(bookId);
  const shown = (items: TItem[]) => items.map((item) => [item.id, item.aliasName || item.title, item.title]);
  const result = (group: { items: Array<{ id: string; title: string; aliasName: string }> }) =>
    group.items.map((item) => [item.id, item.title, item.aliasName]);

  it('keeps the named authors in order and shows their songs by the first line', () => {
    const named = source.filter((group) => group.name);

    expect(groups.map((group) => group.name)).toEqual(named.map((group) => group.name));
    expect(groups.map(result)).toEqual(named.map((group) => shown(group.items)));
  });

  it('puts the songs without an author into a separate named group', () => {
    const noAuthor = source.find((group) => !group.name && group.items.length > 0);

    if (!noAuthor) return expect(unknown).toBeUndefined();

    expect(unknown.name).toBe(translate(bookId, 'AUTHORS_PAGE.UNKNOWN_AUTHOR'));
    expect(unknown.name).toBeTruthy();
    expect(result(unknown)).toEqual(shown(noAuthor.items));
  });
});

describe('cases the rules above rely on', () => {
  it('a real book has songs without an author', () => {
    const { bookId } = findSong('no-author');

    expect(getAuthorsData(bookId).unknown.items.length).toBeGreaterThan(0);
  });
});
