import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';

import BookList from '@/components/home/BookList/BookList';
import { PATH, PREFERENCES } from '@/other/constants';
import { getBookLangLabel } from '@/other/helpers';
import { translate } from '@/other/i18n';
import { getSongbookPagePath, getSongbookPath, SONGBOOK_PAGE } from '@/other/paths';
import { compareBooks } from '@/scripts/compareHelpers';
import { loadPage } from '@/tests/helpers/pageData';

import type { TBooksMap } from '@/types/book';

let booksMap: TBooksMap;
let current: string;

beforeAll(async () => {
  current = Object.values((await loadPage({ kind: 'book-list', bookId: 'en' }, 'book-list')).data.booksMap)
    .filter((book) => !book.hidden && !book.is_legacy)
    .sort(compareBooks)
    .slice(-1)[0].slug;
  booksMap = (await loadPage({ kind: 'book-list', bookId: current }, 'book-list')).data.booksMap;
});

function shownBooks(container: HTMLElement): string[] {
  return [...container.querySelectorAll('.BookCard:not(.BookCard--other) a')].map((a) => a.getAttribute('href'));
}

const linkOf = (bookId: string) => getSongbookPagePath(bookId, SONGBOOK_PAGE.A_Z);

function hiddenBookId(): string {
  const book = Object.values(booksMap).find(({ slug }) => slug !== current);
  if (!book) throw new Error('BookList tests require a second book.');
  return book.slug;
}

function withHiddenBook(bookId = hiddenBookId()): TBooksMap {
  return { ...booksMap, [bookId]: { ...booksMap[bookId], hidden: true } };
}

function withLegacyBooks(): TBooksMap {
  const legacyIds = Object.values(booksMap)
    .filter((book) => !book.hidden && book.slug !== current)
    .slice(0, 2)
    .map((book) => book.slug);
  const hiddenThumbnailId = hiddenBookId();

  return Object.fromEntries(Object.entries(booksMap).map(([id, book]) => [
    id,
    {
      ...book,
      hidden: id === hiddenThumbnailId || book.hidden,
      is_legacy: legacyIds.includes(id) || id === hiddenThumbnailId
        ? { show_micro_thumbnail_on_main: id === legacyIds[0] || id === hiddenThumbnailId }
        : false
    }
  ]));
}

describe('BookList', () => {
  it('shows the current book first, then the other visible books in their sort order', () => {
    // Reversed, so the order on screen cannot come from the order of the data.
    const reversed = Object.fromEntries(Object.entries(booksMap).reverse());
    const { container } = render(<BookList bookId={current} booksMap={reversed} />);
    const others = Object.values(booksMap)
      .filter((book) => book.slug !== current && !book.hidden && !book.is_legacy)
      .sort(compareBooks)
      .map(({ slug }) => linkOf(slug));

    expect(shownBooks(container)).toEqual([linkOf(current), ...others]);
  });

  it('does not show hidden books', () => {
    const hiddenId = hiddenBookId();
    const { container } = render(<BookList bookId={current} booksMap={withHiddenBook(hiddenId)} />);

    expect(shownBooks(container)).not.toContain(linkOf(hiddenId));
  });

  it('shows the current hidden book first, without duplicating it', () => {
    const hidden = hiddenBookId();
    const { container } = render(<BookList bookId={hidden} booksMap={withHiddenBook(hidden)} />);

    expect(shownBooks(container)[0]).toBe(linkOf(hidden));
    expect(shownBooks(container).filter((href) => href === linkOf(hidden))).toHaveLength(1);
  });

  it('shows the title, subtitle, language and song count of every book', () => {
    const { container } = render(<BookList bookId={current} booksMap={booksMap} />);
    const cards = [...container.querySelectorAll('.BookCard:not(.BookCard--other)')].map((card) => ({
      title: card.querySelector('.BookCard__title').textContent,
      subtitle: card.querySelector('.BookCard__subtitle').textContent,
      lang: card.querySelector('.BookCard__lang').textContent,
      count: card.querySelector('.BookCard__count').textContent
    }));

    expect(cards).toEqual(
      [booksMap[current], ...Object.values(booksMap).filter(({ slug, is_legacy, hidden }) => slug !== current && !is_legacy && !hidden).sort(compareBooks)].map(
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

  it('links to other books and lists only legacy books there', () => {
    const books = withLegacyBooks();
    const main = render(<BookList bookId={current} booksMap={books} />);
    const otherLink = main.getByRole('link', { name: translate(current, 'BOOK_LIST_PAGE.OTHER_SONGBOOKS') });
    expect(otherLink.getAttribute('href')).toBe(getSongbookPagePath(current, SONGBOOK_PAGE.OTHER));
    expect(otherLink.querySelector('.BookCard__title').textContent).toBe('');
    expect(otherLink.querySelector('.BookCard__subtitle').textContent).toBe(translate(current, 'BOOK_LIST_PAGE.OTHER_SONGBOOKS'));
    expect(otherLink.querySelector('.BookCard__count').textContent)
      .toBe(String(Object.values(books).filter((book) => book.is_legacy && !book.hidden).length));
    expect(otherLink.querySelector('.BookCard__otherIcon')).not.toBeNull();
    expect([...otherLink.querySelectorAll('.BookCard__otherCover')].map((image) => image.getAttribute('src')))
      .toEqual(Object.values(books).filter((book) => book.is_legacy && !book.hidden && typeof book.is_legacy === 'object' && book.is_legacy.show_micro_thumbnail_on_main).sort(compareBooks)
        .map(({ slug }) => `${PATH.IMG.COVER}banner-${slug}.jpg`));
    expect(otherLink.querySelector('.BookCard__otherMore').textContent).toBe('...');
    main.unmount();

    const other = render(<BookList bookId={current} booksMap={books} other />);
    expect(shownBooks(other.container)).toEqual(
      Object.values(books).filter((book) => book.is_legacy && !book.hidden).sort(compareBooks).map(({ slug }) => linkOf(slug))
    );
  });

  it('links back to the current book root only on the other page', () => {
    const main = render(<BookList bookId={current} booksMap={booksMap} />);
    expect(main.queryByRole('link', { name: translate(current, 'BOOK_LIST_PAGE.BACK') })).toBeNull();
    main.unmount();

    const other = render(<BookList bookId={current} booksMap={booksMap} other />);
    expect(other.getByRole('link', { name: translate(current, 'BOOK_LIST_PAGE.BACK') }).getAttribute('href'))
      .toBe(getSongbookPath(current));
  });

  it.each(['none', 'hidden only'])('does not link to other books when there are %s', (condition) => {
    const books = Object.fromEntries(Object.entries(booksMap).map(([id, book]) => [
      id,
      { ...book, is_legacy: condition === 'hidden only' && !!book.hidden }
    ]));
    const { queryByRole } = render(<BookList bookId={current} booksMap={books} />);

    expect(queryByRole('link', { name: translate(current, 'BOOK_LIST_PAGE.OTHER_SONGBOOKS') })).toBeNull();
  });

  it('links to other books when the current book is the only visible legacy book', () => {
    const legacy = Object.values(withLegacyBooks()).find((book) => book.is_legacy && !book.hidden);
    const books = { [legacy.slug]: legacy };
    const { getByRole } = render(<BookList bookId={legacy.slug} booksMap={books} />);

    expect(getByRole('link', { name: translate(legacy.slug, 'BOOK_LIST_PAGE.OTHER_SONGBOOKS') })).toBeTruthy();
  });

  it('shows the current legacy book first only once', () => {
    const books = withLegacyBooks();
    const legacy = Object.values(books).find((book) => book.is_legacy && !book.hidden);
    const { container } = render(<BookList bookId={legacy.slug} booksMap={books} />);
    expect(shownBooks(container)[0]).toBe(linkOf(legacy.slug));
    expect(shownBooks(container).filter((href) => href === linkOf(legacy.slug))).toHaveLength(1);
    expect(shownBooks(container)).not.toContain(linkOf(Object.values(books).find((book) => book.is_legacy && book.slug !== legacy.slug).slug));
  });

  it('does not show hidden legacy books on the other page', () => {
    const hiddenLegacy = { ...booksMap['en-pe'], hidden: true };
    const books = { ...booksMap, 'en-pe': hiddenLegacy };
    const { container } = render(<BookList bookId="en-pe" booksMap={books} other />);
    expect(shownBooks(container)).not.toContain(linkOf('en-pe'));
  });

  it('includes the other tile in arrow-key navigation', async () => {
    const { getByRole } = render(<BookList bookId={current} booksMap={withLegacyBooks()} />);
    const tile = getByRole('link', { name: translate(current, 'BOOK_LIST_PAGE.OTHER_SONGBOOKS') });
    await userEvent.keyboard('{ArrowLeft}');
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(tile);
  });
});
