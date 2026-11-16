import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';

import BookList from '@/components/home/BookList/BookList';
import { PREFERENCES } from '@/other/constants';
import { getBookLangLabel } from '@/other/helpers';
import { translate } from '@/other/i18n';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { compareBooks } from '@/scripts/compareHelpers';
import { findBook } from '@/tests/helpers/cases';
import { loadPage } from '@/tests/helpers/pageData';

import type { TBooksMap } from '@/types/book';

let booksMap: TBooksMap;
let current: string;

beforeAll(async () => {
  current = Object.values((await loadPage({ kind: 'book-list', bookId: 'en' }, 'book-list')).data.booksMap)
    .filter((book) => !book.hidden)
    .sort(compareBooks)
    .slice(-1)[0].slug;
  booksMap = (await loadPage({ kind: 'book-list', bookId: current }, 'book-list')).data.booksMap;
});

function shownBooks(container: HTMLElement): string[] {
  return [...container.querySelectorAll('.BookCard a')].map((a) => a.getAttribute('href'));
}

const linkOf = (bookId: string) => getSongbookPagePath(bookId, SONGBOOK_PAGE.A_Z);

describe('BookList', () => {
  it('a real book is hidden', () => {
    expect(booksMap[findBook('hidden')].hidden).toBe(true);
  });

  it('shows the current book first, then the other visible books in their sort order', () => {
    // Reversed, so the order on screen cannot come from the order of the data.
    const reversed = Object.fromEntries(Object.entries(booksMap).reverse());
    const { container } = render(<BookList bookId={current} booksMap={reversed} />);
    const others = Object.values(booksMap)
      .filter((book) => book.slug !== current && !book.hidden)
      .sort(compareBooks)
      .map(({ slug }) => linkOf(slug));

    expect(shownBooks(container)).toEqual([linkOf(current), ...others]);
  });

  it('shows hidden books too when the user turned them on', () => {
    localStorage.setItem('SHOW_HIDDEN_BOOKS', '1');
    const { container } = render(<BookList bookId={current} booksMap={booksMap} />);

    expect(shownBooks(container)).toContain(linkOf(findBook('hidden')));
    expect(shownBooks(container)).toHaveLength(Object.keys(booksMap).length);
  });

  it('shows the title, subtitle, language and song count of every book', () => {
    localStorage.setItem('SHOW_HIDDEN_BOOKS', '1');
    const { container } = render(<BookList bookId={current} booksMap={booksMap} />);
    const cards = [...container.querySelectorAll('.BookCard')].map((card) => ({
      title: card.querySelector('.BookCard__title').textContent,
      subtitle: card.querySelector('.BookCard__subtitle').textContent,
      lang: card.querySelector('.BookCard__lang').textContent,
      count: card.querySelector('.BookCard__count').textContent
    }));

    expect(cards).toEqual(
      [booksMap[current], ...Object.values(booksMap).filter(({ slug }) => slug !== current).sort(compareBooks)].map(
        ({ slug, songsCount, subtitle, title }) => ({
          title,
          subtitle,
          lang: getBookLangLabel(slug),
          count: `${songsCount} ${translate(slug, 'BOOK_LIST_PAGE.SONG_COUNT')}`
        })
      )
    );
  });

  it('remembers the chosen book on click', async () => {
    const { getAllByRole } = render(<BookList bookId={current} booksMap={booksMap} />);
    const link = getAllByRole('link')[1];
    link.addEventListener('click', (event) => event.preventDefault());

    await userEvent.click(link);

    expect(linkOf(localStorage.getItem(PREFERENCES.PREFERRED_BOOK_ID))).toBe(link.getAttribute('href'));
  });
});
