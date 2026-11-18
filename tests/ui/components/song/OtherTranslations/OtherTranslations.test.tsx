import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import OtherTranslations from '@/components/song/OtherTranslations/OtherTranslations';
import SongbookList from '@/components/song/OtherTranslations/SongbookList';
import { getBookLangLabel } from '@/other/helpers';
import { translate } from '@/other/i18n';
import { getSongPath } from '@/other/paths';
import { endModalFadeOut } from '@/tests/helpers/modal';
import { loadSongPage } from '@/tests/helpers/pageData';

import type { TPageDataOf } from '@/types/pageData';

let page: TPageDataOf<'song'>;

beforeAll(async () => {
  page = await loadSongPage('in-several-books');
});

/** As on the song page: the list of the song's books inside the modal. */
function renderButton(disabled = false) {
  const { bookId, slug } = page.route;

  render(
    <OtherTranslations bookId={bookId} disabled={disabled}>
      <SongbookList bookDescriptions={page.data.descriptions} bookId={bookId} slug={slug} />
    </OtherTranslations>
  );
}

const button = () => screen.getByTitle(translate(page.route.bookId, 'SONG_PAGE.OTHER_TRANSLATIONS'));
const bookLinks = () => [...document.querySelectorAll<HTMLAnchorElement>('.SongbookList a')];
const toggleByHotkey = () => act(() => window.dispatchEvent(new CustomEvent('kirtan:toggleOtherTranslations')));
const press = (key: string) => fireEvent.keyDown(document, { key });

describe('OtherTranslations', () => {
  it('is a button with the language of the book; the list is closed', () => {
    renderButton();

    expect(button().tagName).toBe('BUTTON');
    expect(button().textContent).toBe(getBookLangLabel(page.route.bookId));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the song in every shown book that has it, the current book marked', async () => {
    renderButton();
    fireEvent.click(button());
    const visible = page.data.descriptions.filter((description) => !description.hidden);
    const shown = [...visible.filter((book) => !book.is_legacy), ...visible.filter((book) => book.is_legacy)];
    await waitFor(() => expect(bookLinks()).toHaveLength(shown.length));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(bookLinks().map((a) => a.getAttribute('href'))).toEqual(
      shown.map((description) => getSongPath(description.slug, page.route.slug))
    );
    expect(
      [...document.querySelectorAll('.SongBookItem__title--active .SongBookItem__lang')].map((el) => el.textContent)
    ).toEqual([getBookLangLabel(page.route.bookId)]);
  });

  it('opens and closes on the hotkey', async () => {
    renderButton();
    toggleByHotkey();
    await waitFor(() => expect(bookLinks().length).toBeGreaterThan(1));

    toggleByHotkey();
    expect(screen.getByRole('dialog').getAttribute('style')).toContain('modal-out');
    endModalFadeOut();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('groups legacy books after regular books with a separator only between visible groups', () => {
    const base = page.data.descriptions[0];
    const books = [
      { ...base, slug: 'en-pe', is_legacy: true, hidden: false },
      { ...base, slug: 'en', is_legacy: false, hidden: false },
      { ...base, slug: 'en-2022', is_legacy: true, hidden: true }
    ];
    const { container, rerender } = render(<SongbookList bookDescriptions={books} bookId="en-pe" slug="song" />);
    expect(bookLinks().map((link) => link.getAttribute('href'))).toEqual(['/en/song/', '/en-pe/song/']);
    expect(container.querySelectorAll('.SongbookList__separator')).toHaveLength(1);
    expect(container.querySelector('.SongBookItem__title--active')).toBeTruthy();

    rerender(<SongbookList bookDescriptions={books.filter((book) => book.is_legacy)} bookId="en-pe" slug="song" />);
    expect(container.querySelectorAll('.SongbookList__separator')).toHaveLength(0);
  });

  it('does not show a separator when all legacy books are hidden', () => {
    const base = page.data.descriptions[0];
    const books = [
      { ...base, slug: 'en', is_legacy: false, hidden: false },
      { ...base, slug: 'en-pe', is_legacy: true, hidden: true }
    ];
    const { container } = render(<SongbookList bookDescriptions={books} bookId="en" slug="song" />);
    expect(container.querySelector('.SongbookList__separator')).toBeNull();
    expect(bookLinks().map((link) => link.getAttribute('href'))).toEqual(['/en/song/']);
  });

  it('when disabled, neither the button nor the hotkey opens it', () => {
    renderButton(true);
    fireEvent.click(button());
    toggleByHotkey();

    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('arrow keys move the focus through the books, round the ends', async () => {
    renderButton();
    fireEvent.click(button());
    await waitFor(() => expect(bookLinks().length).toBeGreaterThan(1));
    const links = bookLinks();

    press('ArrowUp');
    expect(document.activeElement).toBe(links.at(-1));
    press('ArrowDown');
    expect(document.activeElement).toBe(links[0]);
    press('ArrowDown');
    expect(document.activeElement).toBe(links[1]);
  });

  it('starts from the first book on the first ArrowDown', async () => {
    renderButton();
    fireEvent.click(button());
    await waitFor(() => expect(bookLinks().length).toBeGreaterThan(1));
    press('ArrowDown');

    expect(document.activeElement).toBe(bookLinks()[0]);
  });

  it('leaves the arrow keys alone while closed', () => {
    renderButton();
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
