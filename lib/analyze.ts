import { getBooksMap } from '@/lib/books';
import { getContentsByBookId } from '@/lib/contents';
import { ITEM_TYPE } from '@/types/common';
import type { TContentGroup, TContentItem } from '@/types/common';

/** One songbook column in the analyze table. */
export type TAnalyzeBook = {
  bookId: string;
  title: string;
};

/** A single song/book intersection: `null` when the book lacks the song. */
export type TAnalyzeCell = {
  page?: string;
  translated: boolean;
} | null;

/** One song row across all songbooks, keyed by slug. */
export type TAnalyzeRow = {
  slug: string;
  firstLine: string;
  cells: Record<string, TAnalyzeCell>;
};

/**/
export type TAnalyzeData = {
  books: Array<TAnalyzeBook>;
  rows: Array<TAnalyzeRow>;
};

/**
 * Joins a content item's page numbers for display, or `undefined` when the
 * song carries no page (e.g. page-less songbooks).
 */
function formatPage(item: TContentItem): string | undefined {
  if (Array.isArray(item.pages) && item.pages.length > 0) {
    return item.pages.join(', ');
  }
  return item.page || undefined;
}

/** First-line sort key: ignores leading quotes / brackets (e.g. `‘`, `(`). */
function firstLineKey(s: string): string {
  return s.replace(/^[\s‘’'"“(]+/, '');
}

/**
 * Builds the cross-songbook matrix: every song (by slug) as a row, every
 * songbook as a column. The current book is placed first; the rest follow by
 * `sort_order`. Rows are built walking books in that order; `firstLine` comes
 * from the first book (by that order) that contains the song.
 */
export function getAnalyzeData(currentBookId: string): TAnalyzeData {
  const booksMap = getBooksMap();

  const books: Array<TAnalyzeBook> = Object.keys(booksMap)
    .filter((bookId) => !booksMap[bookId].hidden || bookId === currentBookId)
    .sort((a, b) => {
      if (a === currentBookId) return -1;
      if (b === currentBookId) return 1;
      return booksMap[a].sort_order - booksMap[b].sort_order;
    })
    .map((bookId) => ({ bookId, title: booksMap[bookId].title }));

  const rowMap = new Map<string, TAnalyzeRow>();

  for (const { bookId } of books) {
    const groups = getContentsByBookId(bookId);
    for (const group of groups as Array<TContentGroup>) {
      for (const item of group.items) {
        if (item.type !== ITEM_TYPE.SONG) continue;

        let row = rowMap.get(item.id);
        if (!row) {
          row = { slug: item.id, firstLine: item.aliasName, cells: {} };
          rowMap.set(item.id, row);
        }
        row.cells[bookId] = {
          page: formatPage(item),
          translated: Boolean(item.has?.translation)
        };
      }
    }
  }

  return {
    books,
    // Pre-sorted by first line so the client's default view needs no re-sort
    // (avoids a locale-collation hydration mismatch between Node and browser).
    rows: Array.from(rowMap.values()).sort((a, b) =>
      firstLineKey(a.firstLine).localeCompare(firstLineKey(b.firstLine))
    )
  };
}
