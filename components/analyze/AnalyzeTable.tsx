'use client';
import { useMemo, useState } from 'react';

import './AnalyzeTable.scss';
import BookThumbnail from '@/components/common/BookThumnail/BookThumbnail';
import { getBookLangLabel } from '@/other/helpers';
import type { TAnalyzeCell, TAnalyzeData } from '@/lib/analyze';

/**/
type Props = {
  data: TAnalyzeData;
};

/** `'firstLine'` or a bookId. */
type SortKey = string;
type SortDir = 'asc' | 'desc';

/** Leading integer of a cell's page string (`"12, 15"` → 12), or `null`. */
function pageNum(cell: TAnalyzeCell): number | null {
  if (!cell || !cell.page) return null;
  const m = cell.page.match(/\d+/);
  return m ? Number.parseInt(m[0], 10) : null;
}

/**
 * Column-sort rank: paged songs first (0), then page-less "link" songs (1),
 * then songs absent from the book (2). Fixed regardless of sort direction.
 */
function rank(cell: TAnalyzeCell): number {
  if (!cell) return 2;
  return pageNum(cell) === null ? 1 : 0;
}

/**
 * Cross-songbook matrix table. Rows = songs (by slug), columns = songbooks.
 * Each cell links to the song in that book (page number or "yes"), or "-".
 * Sortable by first line (default) or by page number within a songbook.
 */
function AnalyzeTable({ data }: Props) {
  const { books, rows } = data;
  const [sortBy, setSortBy] = useState<SortKey>('firstLine');
  const [dir, setDir] = useState<SortDir>('asc');
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  // Songs present per book, and of those how many are translated (stable;
  // independent of what's hidden).
  const bookCounts = useMemo(() => {
    const total: Record<string, number> = {};
    const translated: Record<string, number> = {};
    for (const book of books) {
      total[book.bookId] = 0;
      translated[book.bookId] = 0;
    }
    for (const row of rows) {
      for (const book of books) {
        const cell = row.cells[book.bookId];
        if (!cell) continue;
        total[book.bookId]++;
        if (cell.translated) translated[book.bookId]++;
      }
    }
    return { total, translated };
  }, [rows, books]);

  const visibleBooks = books.filter((book) => !hidden.has(book.bookId));
  // A hidden book's unique songs (present in no visible book) drop out too.
  const activeSort = hidden.has(sortBy) ? 'firstLine' : sortBy;

  // How many currently-visible songbooks contain a song (translated or not).
  const countBooks = (row: TAnalyzeData['rows'][number]) =>
    visibleBooks.reduce(
      (n, book) => n + (row.cells[book.bookId] ? 1 : 0),
      0
    );

  const sorted = useMemo(() => {
    // Rows arrive pre-sorted by first line from the server. Reusing that order
    // (instead of re-running localeCompare here) keeps SSR and client output
    // identical and avoids a hydration mismatch.
    if (activeSort === 'firstLine') {
      return dir === 'asc' ? rows : [...rows].reverse();
    }
    const factor = dir === 'asc' ? 1 : -1;
    if (activeSort === 'count') {
      const count = (row: TAnalyzeData['rows'][number]) =>
        books.reduce(
          (n, book) =>
            n + (!hidden.has(book.bookId) && row.cells[book.bookId] ? 1 : 0),
          0
        );
      // Equal counts keep the pre-sorted first-line order (stable sort).
      return [...rows].sort((a, b) => factor * (count(a) - count(b)));
    }
    return [...rows].sort((a, b) => {
      const ca = a.cells[activeSort];
      const cb = b.cells[activeSort];
      const ra = rank(ca);
      const rb = rank(cb);
      // Paged songs first, then "link" songs, then absent — direction only
      // reorders paged songs; "link"/absent keep the pre-sorted first-line order.
      if (ra !== rb) return ra - rb;
      if (ra === 0) return factor * (pageNum(ca)! - pageNum(cb)!);
      return 0;
    });
  }, [rows, books, hidden, activeSort, dir]);

  const visibleRows = useMemo(
    () =>
      sorted.filter((row) =>
        books.some((book) => !hidden.has(book.bookId) && row.cells[book.bookId])
      ),
    [sorted, books, hidden]
  );

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setDir('asc');
    }
  }

  function hideBook(bookId: string) {
    setHidden((prev) => new Set(prev).add(bookId));
  }

  function showAll() {
    setHidden(new Set());
  }

  const indicator = (key: SortKey) =>
    sortBy === key ? (dir === 'asc' ? ' ▲' : ' ▼') : '';

  // Both arrows when inactive; only the active direction once sorted by it.
  const sortArrows = (key: SortKey) =>
    sortBy === key ? (dir === 'asc' ? '▲' : '▼') : '▲▼';

  // `translated/total`, collapsed to a single number when all are translated.
  const countLabel = (bookId: string) => {
    const total = bookCounts.total[bookId];
    const translated = bookCounts.translated[bookId];
    return translated === total ? `${total}` : `${translated}/${total}`;
  };

  // Sum of the first column — total song/book occurrences across visible books.
  const totalOccurrences = visibleRows.reduce((n, row) => n + countBooks(row), 0);

  return (
    <div className="AnalyzeTable">
      <table className="AnalyzeTable__table">
        <thead>
          <tr>
            <th className="AnalyzeTable__countHead" scope="col">
                {totalOccurrences}<br/>
              <button
                className="AnalyzeTable__sort"
                onClick={() => toggleSort('count')}
                title="Number of songbooks containing the song"
                type="button"
              >
                {`${sortArrows('count')}`}
              </button>
            </th>
            <th className="AnalyzeTable__corner" scope="col">
              <button
                className="AnalyzeTable__sort"
                onClick={() => toggleSort('firstLine')}
                type="button"
              >
                {`First line (${visibleRows.length})${indicator('firstLine')}`}
              </button>
              {hidden.size > 0 && (
                <button
                  className="AnalyzeTable__showAll"
                  onClick={showAll}
                  type="button"
                >
                  Show all songbooks
                </button>
              )}
            </th>
            {visibleBooks.map((book) => (
              <th className="AnalyzeTable__bookHead" key={book.bookId} scope="col">
                <a className="AnalyzeTable__bookLink" href={`/${book.bookId}`}>
                  <span className="AnalyzeTable__thumb">
                    <BookThumbnail bookId={book.bookId} />
                    <span className="AnalyzeTable__lang">
                      {getBookLangLabel(book.bookId)}
                    </span>
                  </span>
                  <span className="AnalyzeTable__bookTitle">{book.title}</span>
                </a>
                <div className="AnalyzeTable__actions">
                  <button
                    className="AnalyzeTable__sort"
                    onClick={() => toggleSort(book.bookId)}
                    title="translated / total songs"
                    type="button"
                  >
                    {`${countLabel(book.bookId)} ${sortArrows(book.bookId)}`}
                  </button>
                  <button
                    className="AnalyzeTable__hide"
                    onClick={() => hideBook(book.bookId)}
                    title="Hide songbook"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.slug}>
              <td className="AnalyzeTable__count">{countBooks(row)}</td>
              <th className="AnalyzeTable__song" scope="row">
                {row.firstLine}
              </th>

              {visibleBooks.map((book) => {
                const cell = row.cells[book.bookId];
                if (!cell) {
                  return (
                    <td className="AnalyzeTable__cell AnalyzeTable__cell--empty" key={book.bookId}>
                      -
                    </td>
                  );
                }

                return (
                  <td
                    className={
                      cell.translated
                        ? 'AnalyzeTable__cell AnalyzeTable__cell--translated'
                        : 'AnalyzeTable__cell'
                    }
                    key={book.bookId}
                  >
                    <a href={`/${book.bookId}/${row.slug}/`}>
                      {cell.translated ? (cell.page ?? 'link') : `(${cell.page ?? 'link'})`}
                    </a>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**/
export default AnalyzeTable;
