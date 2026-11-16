import { describe, expect, it } from 'vitest';

import {
  getBookDescriptionById,
  getBookIdList,
  getBookIdParamList,
  getBooksMap
} from '@/lib/books';
import * as disk from '@/tests/helpers/books';

describe('lib/books', () => {
  const bookIds = disk.getBookIds();

  it('reads source/books/songbooks.json', () => {
    expect(getBooksMap()).toEqual(disk.getBooksMap());
  });

  it('lists the book ids in the order of the file', () => {
    expect(getBookIdList()).toEqual(bookIds);
    expect(getBookIdParamList()).toEqual(bookIds.map((bookId) => ({ bookId })));
  });

  it('returns the description of a book, or nothing for an unknown id', () => {
    const [bookId] = bookIds;

    expect(getBookDescriptionById(bookId)).toEqual(disk.getBooksMap()[bookId]);
    expect(getBookDescriptionById('no-such-book')).toBeUndefined();
  });
});
