import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NotFound from '@/components/notFound/NotFound';
import { PREFERENCES } from '@/other/constants';
import { translate } from '@/other/i18n';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { openPath, stubBrowserApis } from '@/tests/helpers/app';
import { getBooksMap } from '@/tests/helpers/books';

// The real Layout renders a whole <html> document; the test needs only what is inside <body>.
vi.mock('@/components/common/Layout/Layout', async () => {
  const { default: LayoutChrome } = await import('@/components/common/Layout/LayoutChrome');
  return { default: LayoutChrome };
});

const booksMap = getBooksMap();
const visibleBooks = Object.values(booksMap).filter((book) => !book.hidden);

function setLanguage(language: string) {
  Object.defineProperty(navigator, 'language', { configurable: true, value: language });
}

/** Renders the 404 page and waits until it has picked a book. */
async function renderNotFound(): Promise<string> {
  render(<NotFound booksMap={booksMap} />);
  const title = await screen.findByRole('heading', { level: 3 });
  // Book items show up one effect later (hidden books are decided on the client).
  await waitFor(() => expect(bookLinks()).toHaveLength(visibleBooks.length));
  const bookId = Object.keys(booksMap).find(
    (id) => title.textContent === translate(id, 'NOT_FOUND_PAGE.TITLE') && isShownFirst(id)
  );

  return bookId ?? `unknown (title "${title.textContent}")`;
}

function bookLinks(): string[] {
  return [...document.querySelectorAll('.NotFoundPage__list a')].map((a) => a.getAttribute('href'));
}

const isShownFirst = (bookId: string) => bookLinks()[0] === getSongbookPagePath(bookId, SONGBOOK_PAGE.A_Z);

beforeEach(() => {
  stubBrowserApis();
  vi.stubGlobal('fetch', vi.fn());
  setLanguage('en-US');
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (navigator as { language?: string }).language;
});

describe('NotFound: which book it speaks for', () => {
  it.each(visibleBooks.map(({ slug }) => slug))('the book in the path (%s)', async (bookId) => {
    openPath(`/${bookId}/no-such-song/`);

    expect(await renderNotFound()).toBe(bookId);
  });

  it('the book the user chose before, when the path has none', async () => {
    const chosen = visibleBooks.find(({ slug }) => slug !== 'en').slug;
    localStorage.setItem(PREFERENCES.PREFERRED_BOOK_ID, chosen);
    openPath('/no-such-page/');

    expect(await renderNotFound()).toBe(chosen);
  });

  it('the browser language, when the stored book does not exist', async () => {
    const other = visibleBooks.find(({ slug }) => slug !== 'en' && slug.length === 2).slug;
    localStorage.setItem(PREFERENCES.PREFERRED_BOOK_ID, 'gone');
    setLanguage(`${other}-XX`);
    openPath('/no-such-page/');

    expect(await renderNotFound()).toBe(other);
  });

  it('English when nothing matches a book, and the footer links stay inside it', async () => {
    setLanguage('ja-JP');
    openPath('/no-such-page/');

    expect(await renderNotFound()).toBe('en');
    const footerLinks = [...document.querySelectorAll('.Footer a')].map((a) => a.getAttribute('href'));
    expect(footerLinks.length).toBeGreaterThan(0);
    expect(footerLinks.filter((href) => !href.startsWith('/en/'))).toEqual([]);
  });
});

describe('NotFound: content', () => {
  it('lists every visible book, the current one first, each linking to its A–Z page', async () => {
    const current = visibleBooks[visibleBooks.length - 1].slug;
    openPath(`/${current}/missing/`);
    await renderNotFound();

    expect(bookLinks()).toEqual([
      getSongbookPagePath(current, SONGBOOK_PAGE.A_Z),
      ...visibleBooks.filter(({ slug }) => slug !== current).map(({ slug }) => getSongbookPagePath(slug, SONGBOOK_PAGE.A_Z))
    ]);
  });

  it('shows the text in the book language', async () => {
    const current = visibleBooks.find(({ slug }) => slug !== 'en' && slug.length === 2).slug;
    openPath(`/${current}/missing/`);
    await renderNotFound();

    expect(document.querySelector('.NotFoundPage__text').textContent).toBe(translate(current, 'NOT_FOUND_PAGE.TEXT'));
  });
});

describe('NotFound: old .html addresses', () => {
  it('opens the new address when it exists', async () => {
    const target = { pathname: '/en/some-song.html', href: '' };
    vi.stubGlobal('location', target);
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    const { container } = render(<NotFound booksMap={booksMap} />);

    await waitFor(() => expect(target.href).toBe('/en/some-song'));
    expect(fetch).toHaveBeenCalledWith('/en/some-song', { method: 'HEAD' });
    expect(container.innerHTML).toBe('');
  });

  it('shows the 404 page when the new address does not exist either', async () => {
    openPath('/en/some-song.html');
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    expect(await renderNotFound()).toBe('en');
    expect(window.location.pathname).toBe('/en/some-song.html');
  });

  it('does not ask the server for other addresses', async () => {
    openPath('/en/missing/');
    await renderNotFound();

    expect(fetch).not.toHaveBeenCalled();
  });
});
