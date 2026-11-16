import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Footer from '@/components/common/Footer/Footer';
import { translate } from '@/other/i18n';
import { getSongbookPagePath, getSongbookPath, SONGBOOK_PAGE } from '@/other/paths';
import { openPath } from '@/tests/helpers/app';
import { getBookIds } from '@/tests/helpers/books';

const bookId = getBookIds().find((id) => id !== 'en');

const PATHS = {
  books: getSongbookPath(bookId),
  contents: getSongbookPagePath(bookId, SONGBOOK_PAGE.CONTENTS),
  'a-z': getSongbookPagePath(bookId, SONGBOOK_PAGE.A_Z),
  search: getSongbookPagePath(bookId, SONGBOOK_PAGE.SEARCH)
};

function links() {
  return screen.getAllByRole('link').map((link) => ({
    href: link.getAttribute('href'),
    current: link.getAttribute('aria-current'),
    active: link.classList.contains('FooterItem--active')
  }));
}

const searchLink = () => links()[3].href;

describe('Footer', () => {
  it('links to the books, contents, A–Z and search pages of the book, with labels in its language', () => {
    openPath('/');
    render(<Footer bookId={bookId} />);

    expect(screen.getByRole('navigation').getAttribute('aria-label')).toBeTruthy();
    expect(links().map(({ href }) => href)).toEqual(Object.values(PATHS));
    expect(document.querySelector('.FooterItem__label').textContent).toBe(translate(bookId, 'FOOTER.BOOKS'));
  });

  it.each(Object.entries(PATHS))('marks the %s link as the current page', (_, path) => {
    openPath(path);
    render(<Footer bookId={bookId} />);

    expect(links().filter(({ current }) => current === 'page').map(({ href }) => href.split('?')[0])).toEqual([path]);
    expect(links().filter(({ active }) => active)).toHaveLength(1);
  });

  it('marks nothing on a song page', () => {
    openPath(`/${bookId}/some-song/`);
    render(<Footer bookId={bookId} />);

    expect(links().filter(({ current, active }) => current || active)).toEqual([]);
  });

  it('marks the current page also without the trailing slash', () => {
    openPath(PATHS.contents.replace(/\/$/, ''));
    render(<Footer bookId={bookId} />);

    expect(links().find(({ current }) => current === 'page')?.href).toBe(PATHS.contents);
  });

  it('follows client-side navigation', () => {
    openPath(PATHS.contents);
    render(<Footer bookId={bookId} />);
    openPath(PATHS['a-z']);

    expect(links().find(({ current }) => current === 'page').href).toBe(PATHS['a-z']);
  });

  describe('search link', () => {
    it('has no page without a song page', () => {
      openPath('/');
      render(<Footer bookId={bookId} />);

      expect(searchLink()).toBe(PATHS.search);
    });

    it('carries the page of the song', () => {
      openPath('/');
      render(<Footer bookId={bookId} page="42" />);

      expect(searchLink()).toBe(`${PATHS.search}?p=42`);
    });

    it('carries the first page of a song with several', () => {
      openPath('/');
      render(<Footer bookId={bookId} page={['42', '108']} />);

      expect(searchLink()).toBe(`${PATHS.search}?p=42`);
    });

    it('carries the page in ?p= (the one the song was opened from)', () => {
      openPath('/?p=108');
      render(<Footer bookId={bookId} page={['42', '108']} />);

      expect(searchLink()).toBe(`${PATHS.search}?p=108`);
    });
  });
});
