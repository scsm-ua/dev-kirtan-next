import { describe, expect, it } from 'vitest';

import {
  getAuthorsByBookId,
  getContentItemBySlug,
  getContentsByBookId,
  getIndexesByBookId
} from '@/lib/contents';
import { getBookIds, getItems, readBookFile } from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';

describe.each(getBookIds())('lists of %s', (bookId) => {
  it.each([
    ['contents.json', getContentsByBookId],
    ['a-z.json', getIndexesByBookId],
    ['authors.json', getAuthorsByBookId]
  ])('reads %s', (file, read) => {
    expect(read(bookId)).toEqual(readBookFile(bookId, file));
  });
});

describe('getContentItemBySlug', () => {
  it('finds an item by its slug', () => {
    const { bookId, slug } = findSong('meta-author');

    expect(getContentItemBySlug(bookId, slug)).toEqual(getItems(bookId).find((item) => item.id === slug));
  });

  it('returns the first place of a song that is listed twice', () => {
    const { bookId, slug } = findSong('listed-twice-with-several-pages');
    const item = getContentItemBySlug(bookId, slug);

    expect(item.page).toBe(item.pages[0]);
  });

  it('returns null for an unknown slug', () => {
    const [bookId] = getBookIds();

    expect(getContentItemBySlug(bookId, 'no-such-item')).toBeNull();
  });
});
