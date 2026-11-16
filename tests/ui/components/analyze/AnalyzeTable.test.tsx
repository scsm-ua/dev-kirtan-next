import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, describe, expect, it, vi } from 'vitest';

import AnalyzeTable from '@/components/analyze/AnalyzeTable';
import { getAnalyzeData } from '@/lib/analyze';
import { getBookIds } from '@/tests/helpers/books';

import type { TAnalyzeCell, TAnalyzeRow } from '@/lib/analyze';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const [currentBookId] = getBookIds();
const data = getAnalyzeData(currentBookId);
const { books, rows } = data;
const bookIds = books.map((book) => book.bookId);

/** Leading number of the page of a cell, or `null` for a song without a page. */
const pageOf = (cell: TAnalyzeCell) => (cell?.page && /\d+/.test(cell.page) ? parseInt(/\d+/.exec(cell.page)[0], 10) : null);
const countBooks = (row: TAnalyzeRow, among = bookIds) => among.filter((bookId) => row.cells[bookId]).length;
const firstLineOrder = new Map(rows.map((row, index) => [row.slug, index]));
const rowBySlug = new Map(rows.map((row) => [row.slug, row]));

// A book whose songs have at least two different page numbers: sorting by it has something to order.
const sortBookId = bookIds.find(
  (bookId) => new Set(rows.map((row) => pageOf(row.cells[bookId])).filter((page) => page !== null)).size > 1
);
// A book with a song that no other book has: hiding it removes rows, not only a column.
const hideBookId = bookIds.find((bookId) => rows.some((row) => row.cells[bookId] && countBooks(row) === 1));

function renderTable() {
  render(<AnalyzeTable data={data} />);
  return userEvent.setup();
}

const headCells = () => [...document.querySelectorAll('thead th.AnalyzeTable__bookHead')];
const shownBookTitles = () => headCells().map((th) => th.querySelector('.AnalyzeTable__bookTitle').textContent);
const headOf = (bookId: string) => headCells()[shownBookIds().indexOf(bookId)];
const shownBookIds = () =>
  headCells().map((th) => th.querySelector('a').getAttribute('href').split('/').filter(Boolean)[0]);
const sortButtonOf = (bookId: string) => headOf(bookId).querySelector<HTMLButtonElement>('.AnalyzeTable__sort');
const hideButtonOf = (bookId: string) => headOf(bookId).querySelector<HTMLButtonElement>('.AnalyzeTable__hide');
const firstLineButton = () => document.querySelector<HTMLButtonElement>('.AnalyzeTable__corner .AnalyzeTable__sort');
const countButton = () => document.querySelector<HTMLButtonElement>('.AnalyzeTable__countHead .AnalyzeTable__sort');
const bodyRows = () => [...document.querySelectorAll('tbody tr')];

/** Slugs of the shown rows, top to bottom: every row links to its song in some book. */
const shownSlugs = () =>
  bodyRows().map((tr) => tr.querySelector('a').getAttribute('href').split('/').filter(Boolean)[1]);

describe('AnalyzeTable', () => {
  it('has real data for every case below', () => {
    expect(rows.length).toBeGreaterThan(1);
    expect(sortBookId).toBeTruthy();
    expect(hideBookId).toBeTruthy();
  });

  describe('as it opens', () => {
    it('has a column per book, in the given order, linked to the book', () => {
      renderTable();

      expect(shownBookIds()).toEqual(bookIds);
      expect(shownBookTitles()).toEqual(books.map((book) => book.title));
      expect(document.querySelector('.AnalyzeTable__showAll')).toBeNull();
    });

    it('has a row per song, in the given (first line) order', () => {
      renderTable();

      expect(shownSlugs()).toEqual(rows.map((row) => row.slug));
      expect(bodyRows().map((tr) => tr.querySelector('th').textContent)).toEqual(rows.map((row) => row.firstLine));
      expect(firstLineButton().textContent).toBe(`First line (${rows.length}) ▲`);
    });

    it('shows in every cell the page or "link", in brackets when the song is not translated, or a dash', () => {
      renderTable();
      const problems = bodyRows().flatMap((tr, index) => {
        const row = rows[index];

        return [...tr.querySelectorAll('td.AnalyzeTable__cell')].flatMap((td, column) => {
          const bookId = bookIds[column];
          const cell = row.cells[bookId];
          const link = td.querySelector('a');
          const text = cell ? (cell.translated ? (cell.page ?? 'link') : `(${cell.page ?? 'link'})`) : '-';
          const href = cell ? `/${bookId}/${row.slug}/` : undefined;

          return td.textContent === text && link?.getAttribute('href') === href
            ? []
            : [`${row.slug} in ${bookId}: "${td.textContent}" → ${link?.getAttribute('href')}`];
        });
      });

      expect(problems).toEqual([]);
      expect(document.querySelectorAll('td.AnalyzeTable__cell')).toHaveLength(rows.length * books.length);
    });

    it('counts the books of every song, and the total', () => {
      renderTable();
      const counts = rows.map((row) => countBooks(row));

      expect(bodyRows().map((tr) => Number(tr.querySelector('.AnalyzeTable__count').textContent))).toEqual(counts);
      expect(document.querySelector('.AnalyzeTable__countHead').firstChild.textContent).toBe(
        String(counts.reduce((sum, count) => sum + count, 0))
      );
    });

    it('shows for every book how many of its songs are translated', () => {
      renderTable();
      const labels = bookIds.map((bookId) => {
        const cells = rows.map((row) => row.cells[bookId]).filter(Boolean);
        const translated = cells.filter((cell) => cell.translated).length;

        return `${translated === cells.length ? cells.length : `${translated}/${cells.length}`} ▲▼`;
      });

      expect(bookIds.map((bookId) => sortButtonOf(bookId).textContent)).toEqual(labels);
    });
  });

  describe('sorting', () => {
    it('reverses the first-line order on a click, and restores it on the next one', async () => {
      const user = renderTable();
      const slugs = rows.map((row) => row.slug);

      await user.click(firstLineButton());
      expect(shownSlugs()).toEqual([...slugs].reverse());
      expect(firstLineButton().textContent).toBe(`First line (${rows.length}) ▼`);

      await user.click(firstLineButton());
      expect(shownSlugs()).toEqual(slugs);
    });

    it('by a book: its songs by page, then its songs without a page, then the songs it lacks', async () => {
      const user = renderTable();

      await user.click(sortButtonOf(sortBookId));

      const shown = shownSlugs().map((slug) => rowBySlug.get(slug));
      const rank = (row: TAnalyzeRow) => (!row.cells[sortBookId] ? 2 : pageOf(row.cells[sortBookId]) === null ? 1 : 0);
      const paged = shown.filter((row) => rank(row) === 0);
      const rest = shown.filter((row) => rank(row) > 0);
      const inFirstLineOrder = (list: TAnalyzeRow[]) =>
        list.every((row, i) => i === 0 || firstLineOrder.get(list[i - 1].slug) < firstLineOrder.get(row.slug));

      expect(shown).toHaveLength(rows.length);
      // Three blocks, in this order.
      expect(shown.map(rank)).toEqual([...shown.map(rank)].sort());
      // Pages go up.
      expect(paged.map((row) => pageOf(row.cells[sortBookId]))).toEqual(
        [...paged.map((row) => pageOf(row.cells[sortBookId]))].sort((a, b) => a - b)
      );
      // The songs without a page keep the first-line order inside their blocks.
      expect(inFirstLineOrder(rest.filter((row) => rank(row) === 1))).toBe(true);
      expect(inFirstLineOrder(rest.filter((row) => rank(row) === 2))).toBe(true);
      expect(sortButtonOf(sortBookId).textContent.endsWith(' ▲')).toBe(true);
      expect(firstLineButton().textContent).toBe(`First line (${rows.length})`);
    });

    it('by a book, second click: only the pages turn around', async () => {
      const user = renderTable();
      await user.click(sortButtonOf(sortBookId));
      const ascending = shownSlugs().map((slug) => rowBySlug.get(slug));

      await user.click(sortButtonOf(sortBookId));

      const descending = shownSlugs().map((slug) => rowBySlug.get(slug));
      const isPaged = (row: TAnalyzeRow) => pageOf(row.cells[sortBookId]) !== null;
      const pages = descending.filter(isPaged).map((row) => pageOf(row.cells[sortBookId]));

      expect(pages).toEqual([...pages].sort((a, b) => b - a));
      expect(pages[0]).toBeGreaterThan(pages.at(-1));
      expect(descending.filter((row) => !isPaged(row))).toEqual(ascending.filter((row) => !isPaged(row)));
      expect(sortButtonOf(sortBookId).textContent.endsWith(' ▼')).toBe(true);
    });

    it('by the number of books: fewest first, then most first; equal ones keep the first-line order', async () => {
      const user = renderTable();
      const expected = (factor: 1 | -1) =>
        [...rows]
          .sort(
            (a, b) =>
              factor * (countBooks(a) - countBooks(b)) || firstLineOrder.get(a.slug) - firstLineOrder.get(b.slug)
          )
          .map((row) => row.slug);

      await user.click(countButton());
      expect(shownSlugs()).toEqual(expected(1));
      expect(countButton().textContent).toBe('▲');

      await user.click(countButton());
      expect(shownSlugs()).toEqual(expected(-1));
      expect(countButton().textContent).toBe('▼');
    });
  });

  describe('hiding a book', () => {
    const othersOf = (hidden: string) => bookIds.filter((bookId) => bookId !== hidden);

    it('removes its column and the songs only it has, and recounts', async () => {
      const user = renderTable();
      const others = othersOf(hideBookId);
      const left = rows.filter((row) => countBooks(row, others) > 0);

      await user.click(hideButtonOf(hideBookId));

      expect(shownBookIds()).toEqual(others);
      expect(shownSlugs()).toEqual(left.map((row) => row.slug));
      expect(left.length).toBeLessThan(rows.length);
      expect(firstLineButton().textContent).toBe(`First line (${left.length}) ▲`);
      expect(bodyRows().map((tr) => Number(tr.querySelector('.AnalyzeTable__count').textContent))).toEqual(
        left.map((row) => countBooks(row, others))
      );
      expect(document.querySelector('.AnalyzeTable__countHead').firstChild.textContent).toBe(
        String(left.reduce((sum, row) => sum + countBooks(row, others), 0))
      );
    });

    it('keeps the translated/total numbers of the other books as they were', async () => {
      const user = renderTable();
      const others = othersOf(hideBookId);
      const before = others.map((bookId) => sortButtonOf(bookId).textContent);

      await user.click(hideButtonOf(hideBookId));

      expect(others.map((bookId) => sortButtonOf(bookId).textContent)).toEqual(before);
    });

    it('brings everything back with "Show all songbooks"', async () => {
      const user = renderTable();
      await user.click(hideButtonOf(hideBookId));
      await user.click(hideButtonOf(othersOf(hideBookId)[0]));
      expect(shownBookIds()).toHaveLength(books.length - 2);

      await user.click(document.querySelector('.AnalyzeTable__showAll'));

      expect(shownBookIds()).toEqual(bookIds);
      expect(shownSlugs()).toEqual(rows.map((row) => row.slug));
      expect(document.querySelector('.AnalyzeTable__showAll')).toBeNull();
    });

    it('goes back to the first-line order when the book it was sorted by is hidden', async () => {
      const user = renderTable();
      const others = othersOf(sortBookId);
      await user.click(sortButtonOf(sortBookId));

      await user.click(hideButtonOf(sortBookId));

      expect(shownSlugs()).toEqual(rows.filter((row) => countBooks(row, others) > 0).map((row) => row.slug));
    });
  });
});
