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
    const shown = page.data.descriptions.filter((description) => !description.hidden);
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
