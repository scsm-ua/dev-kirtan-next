import { afterAll, describe, expect, it, vi } from 'vitest';

import { getAnalyzeData } from '@/lib/analyze';
import { compareFirstLines } from '@/scripts/compareHelpers';
import { getBookIds, getBooksMap, getItems } from '@/tests/helpers/books';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const booksMap = getBooksMap();
const songsOf = (bookId: string) => getItems(bookId).filter((item) => item.type === 'song');

describe.each(getBookIds())('getAnalyzeData for %s', (currentBookId) => {
  const { books, rows } = getAnalyzeData(currentBookId);

  it('puts the current book first and the others in the site order', () => {
    const others = getBookIds()
      .filter((bookId) => bookId !== currentBookId)
      .sort((a, b) => (booksMap[a].sort_order ?? Infinity) - (booksMap[b].sort_order ?? Infinity));

    expect(books.map((book) => book.bookId)).toEqual([currentBookId, ...others]);
    expect(books.every((book) => book.title === booksMap[book.bookId].title)).toBe(true);
  });

  it('has one row for every song of any book, sorted by the first line', () => {
    const slugs = new Set(getBookIds().flatMap((bookId) => songsOf(bookId).map((item) => item.id)));
    const outOfOrder = rows.slice(1).filter((row, i) => compareFirstLines(rows[i].firstLine, row.firstLine) > 0);

    expect(rows.map((row) => row.slug).sort()).toEqual([...slugs].sort());
    expect(outOfOrder.map((row) => row.slug)).toEqual([]);
  });

  it('fills a cell for exactly the books that have the song', () => {
    const problems = rows.flatMap((row) =>
      getBookIds().flatMap((bookId) => {
        const item = songsOf(bookId).findLast((candidate) => candidate.id === row.slug);
        const cell = row.cells[bookId];

        if (!item) return cell ? [`${row.slug}: a cell for ${bookId}`] : [];
        if (!cell) return [`${row.slug}: no cell for ${bookId}`];
        if (cell.translated !== item.has.translation) return [`${row.slug}: translated flag in ${bookId}`];

        return cell.page !== (item.pages.length ? item.pages.join(', ') : undefined)
          ? [`${row.slug}: page "${cell.page}" in ${bookId}`]
          : [];
      })
    );

    expect(problems).toEqual([]);
  });
});
