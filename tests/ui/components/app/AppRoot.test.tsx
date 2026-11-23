import { act, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { translate } from '@/other/i18n';
import { getRoutePath } from '@/other/router/routes';
import { renderApp, stubBrowserApis } from '@/tests/helpers/app';
import { getBookIds, getItems, getSongItems } from '@/tests/helpers/books';
import { findBook, findSong } from '@/tests/helpers/cases';
import { mockDataFetch } from '@/tests/helpers/dataServer';
import { mockLocationMethods } from '@/tests/helpers/location';
import { loadPage, loadSongPage } from '@/tests/helpers/pageData';

import type { TPageDataOf } from '@/types/pageData';

const [bookId] = getBookIds();

/** A song the page store has not seen yet: the store keeps its cache for the whole file. */
const songs = getSongItems(bookId);
let nextSong = 0;
const freshSlug = () => songs[nextSong++].id;

let contents: TPageDataOf<'contents'>;
let fetchMock: ReturnType<typeof mockDataFetch>;

const main = () => document.querySelector('main.Main');
const footerLinks = () => [...document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Songbook navigation"] a')];
const currentFooterLinks = () => footerLinks().filter((link) => link.getAttribute('aria-current') === 'page');

/** Clicks a link the way a user does; jsdom cannot follow it, so the default action is always stopped. */
function click(link: Element): void {
  window.addEventListener('click', (e) => e.preventDefault(), { once: true });
  act(() => {
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, cancelable: true }));
  });
}

/** The link of the page to this path. */
function getLink(path: string): HTMLAnchorElement {
  const link = [...main().querySelectorAll<HTMLAnchorElement>('a[href]')].find(
    (candidate) => candidate.getAttribute('href').split('?')[0] === path
  );
  if (!link) throw new Error(`No link to ${path} on the page.`);
  return link;
}

beforeAll(async () => {
  contents = await loadPage({ kind: 'contents', bookId }, 'contents');
});

beforeEach(() => {
  stubBrowserApis();
  fetchMock = mockDataFetch();
  mockLocationMethods();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppRoot', () => {
  describe('renders the view of the page data it is given', () => {
    it('contents: the title and every item that is not hidden', () => {
      renderApp(contents);
      const visible = contents.data.groups.flatMap((group) =>
        group.items.filter((item) => !item.title.includes('(hidden)'))
      );

      expect(document.querySelector('h1').textContent).toBe(translate(bookId, 'CONTENTS_PAGE.LINK_FULL_TITLE'));
      expect(main().querySelectorAll('.ContentItem')).toHaveLength(visible.length);
      expect(visible.length).toBeGreaterThan(0);
    });

    it('a-z: the title, a pill per letter and every first line', async () => {
      const page = await loadPage({ kind: 'a-z', bookId }, 'a-z');
      renderApp(page);

      expect(document.querySelector('h1').textContent).toBe(translate(bookId, 'A_Z_PAGE.LINK_FULL_TITLE'));
      expect([...main().querySelectorAll('.Pills__button')].map((pill) => pill.textContent)).toEqual(
        page.data.groups.map((group) => group.name)
      );
      expect(main().querySelectorAll('.ContentItem')).toHaveLength(
        page.data.groups.reduce((sum, group) => sum + group.items.length, 0)
      );
    });

    it('authors: a badge and a section per author, without the songs of unknown authors', async () => {
      const page = await loadPage({ kind: 'authors', bookId }, 'authors');
      renderApp(page);
      const names = page.data.groups.map((group) => group.name);

      expect([...main().querySelectorAll('.AuthorBadges__button')].map((badge) => badge.textContent)).toEqual(
        page.data.groups.map((group) => `${group.name} (${group.items.length})`)
      );
      expect([...main().querySelectorAll('.ContentGroup')].map((group) => group.id)).toEqual(
        names.map((name) => `section-${name}`)
      );
      expect(names.length).toBeGreaterThan(0);
    });

    it('search: the input and a button per page of the paper songbook', async () => {
      const page = await loadPage({ kind: 'search', bookId }, 'search');
      renderApp(page);

      expect(main().querySelector('input.SearchControls__input')).not.toBeNull();
      expect([...main().querySelectorAll('.PageList__buttonText')].map((button) => button.textContent)).toEqual(
        page.data.pages.map((item) => item.page)
      );
    });

    it('book list: visible non-legacy books and the current book first', async () => {
      const page = await loadPage({ kind: 'book-list', bookId }, 'book-list');
      renderApp(page);
      const shown = Object.values(page.data.booksMap).filter((book) => !book.hidden && (!book.is_legacy || book.slug === bookId));
      const titles = [...main().querySelectorAll('.BookCard:not(.BookCard--other) .BookCard__title')].map((title) => title.textContent);

      expect(titles).toHaveLength(shown.length);
      expect(titles[0]).toBe(page.data.booksMap[bookId].title);
      expect([...titles].sort()).toEqual(shown.map((book) => book.title).sort());
    });

    it('audio: the singers with their counts and a player per recording', async () => {
      const audioBookId = getBookIds().find((id) => getSongItems(id).some((item) => item.has.audio));
      const page = await loadPage({ kind: 'audio', bookId: audioBookId }, 'audio');
      renderApp(page);

      expect(document.querySelector('h1').textContent).toBe(translate(audioBookId, 'AUDIO_PAGE.LINK_FULL_TITLE'));
      // The first row is "all recordings".
      expect([...main().querySelectorAll('.SingerList__name')].slice(1).map((name) => name.textContent)).toEqual(
        page.data.singers.map((singer) => singer.name)
      );
      expect(main().querySelectorAll('.Playlist .PlayerWidget')).toHaveLength(page.data.tracks.length);
      expect(page.data.tracks.length).toBeGreaterThan(0);
    });

    it('audio of a singer: the name of the singer and only their recordings', async () => {
      const audioBookId = getBookIds().find((id) => getSongItems(id).some((item) => item.has.audio));
      const [singer] = (await loadPage({ kind: 'audio', bookId: audioBookId }, 'audio')).data.singers;
      const page = await loadPage({ kind: 'audio-singer', bookId: audioBookId, singerId: singer.id }, 'audio-singer');
      renderApp(page);

      expect(main().querySelector('.AudioPage__singer').textContent).toBe(singer.name);
      expect(main().querySelectorAll('.Playlist .PlayerWidget')).toHaveLength(singer.count);
      expect(main().querySelector('.SingerList__link[aria-current="page"] .SingerList__name').textContent).toBe(
        singer.name
      );
    });

    it('song: the book, the title, every verse and the previous and next songs', async () => {
      const page = await loadSongPage('in-one-book');
      const { book, nav, song } = page.data;
      renderApp(page);
      const heading = document.querySelector('h1').textContent;
      const neighbours = Object.values(nav)[0];

      expect(main().classList.contains('ContentPage')).toBe(true);
      expect(main().querySelector('.ContentPage__book').textContent).toBe(book.title);
      expect(song.title.filter((line) => line.trim()).every((line) => heading.includes(line))).toBe(true);
      expect(main().querySelectorAll('.Verse')).toHaveLength(song.verses.length);
      expect(
        [...document.querySelectorAll('nav[aria-label="Previous / next song"] a')].map((link) => link.getAttribute('href'))
      ).toEqual([neighbours.prev, neighbours.next].flatMap((item) => (item ? [item.path] : [])));
    });

    it('song with audio: a player per recording', async () => {
      const page = await loadSongPage('several-singers');
      renderApp(page);

      expect(main().querySelectorAll('.AudioList .PlayerWidget')).toHaveLength(page.data.song.resources.audio.length);
    });

    it('markdown page: the rendered markdown', async () => {
      const pageBookId = findBook('markdown-pages');
      const { id } = getItems(pageBookId).find((item) => item.type === 'page');
      const page = await loadPage({ kind: 'item', bookId: pageBookId, slug: id }, 'page');
      renderApp(page);

      expect(main().classList.contains('ContentPage')).toBe(true);
      expect(main().querySelector('.PageMarkdown').innerHTML).toBe(page.data.page.bodyHtml);
      expect(page.data.page.bodyHtml).toBeTruthy();
    });
  });

  describe('the frame around the view', () => {
    it('has the header link to the book, the footer navigation and a hidden player dock', () => {
      renderApp(contents);
      const dock = document.querySelector('[role="region"][aria-label="Now playing"]');

      expect(document.querySelector('.Header__home').getAttribute('href')).toBe(`/${bookId}/`);
      expect(footerLinks().map((link) => link.getAttribute('href'))).toEqual([
        `/${bookId}/`,
        `/${bookId}/contents/`,
        `/${bookId}/a-z/`,
        `/${bookId}/search/`
      ]);
      expect(dock.getAttribute('aria-hidden')).toBe('true');
      expect(dock.hasAttribute('inert')).toBe(true);
      expect(document.querySelector('.AppRoot__progress')).toBeNull();
    });

    it('keeps the footer inside the scroller, after main, so it can scroll above the player dock', () => {
      renderApp(contents);

      expect(main().nextElementSibling).toBe(document.querySelector('.Layout__content > footer.Footer'));
      expect(document.querySelectorAll('.Footer')).toHaveLength(1);
    });

    it('marks the footer link of the shown page, and none on a song', async () => {
      const first = renderApp(contents);
      expect(currentFooterLinks().map((link) => link.getAttribute('href'))).toEqual([`/${bookId}/contents/`]);
      first.unmount();

      renderApp(await loadSongPage('in-one-book'));
      expect(currentFooterLinks()).toEqual([]);
    });

    it('shows the server-only extras with the page the document came with', () => {
      renderApp(contents, { extras: <script data-testid="extras" type="application/ld+json" /> });

      expect(main().querySelectorAll('[data-testid="extras"]')).toHaveLength(1);
    });
  });

  describe('a click on a link of the page', () => {
    it('shows the song without loading a document, and brings the URL, the title and the footer in line', async () => {
      renderApp(contents, { extras: <script data-testid="extras" type="application/ld+json" /> });
      const slug = freshSlug();
      const path = `/${bookId}/${slug}/`;
      const song = await loadPage({ kind: 'item', bookId, slug }, 'song');

      click(getLink(path));
      await waitFor(() => expect(main().classList.contains('ContentPage')).toBe(true));

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/data/${bookId}/${slug}.json`);
      expect(window.location.pathname).toBe(path);
      expect(document.title).toBe(song.head.title);
      expect(main().querySelectorAll('.Verse')).toHaveLength(song.data.song.verses.length);
      expect(main().querySelector('.Contents__title')).toBeNull();
      expect(currentFooterLinks()).toEqual([]);
      // The extras belong to the document's own page only.
      expect(document.querySelector('[data-testid="extras"]')).toBeNull();
    });

    it('goes on to the next song from the song, and back to the first page with the browser', async () => {
      renderApp(contents);
      const slug = freshSlug();
      click(getLink(`/${bookId}/${slug}/`));
      await waitFor(() => expect(window.location.pathname).toBe(`/${bookId}/${slug}/`));

      const next = document.querySelector<HTMLAnchorElement>('.PrevNextLink--next[href]');
      const nextPath = next.getAttribute('href');
      click(next);
      await waitFor(() => expect(window.location.pathname).toBe(nextPath));
      expect(main().classList.contains('ContentPage')).toBe(true);

      act(() => window.history.go(-2));
      await waitFor(() => expect(main().querySelector('.Contents__title')).not.toBeNull());
      expect(window.location.pathname).toBe(getRoutePath(contents.route));
      expect(currentFooterLinks().map((link) => link.getAttribute('href'))).toEqual([`/${bookId}/contents/`]);
    });

    it('opens a footer page', async () => {
      renderApp(contents);

      click(footerLinks().find((link) => link.getAttribute('href') === `/${bookId}/a-z/`));
      await waitFor(() => expect(main().querySelector('.AZ__title')).not.toBeNull());

      expect(currentFooterLinks().map((link) => link.getAttribute('href'))).toEqual([`/${bookId}/a-z/`]);
    });
  });

  describe('as the offline shell, without page data', () => {
    it('shows progress, then the page of the URL', async () => {
      const { bookId: songBookId, slug } = findSong('no-audio');
      const song = await loadPage({ kind: 'item', bookId: songBookId, slug }, 'song');
      window.history.replaceState(null, '', `/${songBookId}/${slug}/`);

      renderApp(null);
      expect(document.querySelector('.AppRoot__progress')).not.toBeNull();
      expect(main()).toBeNull();

      // The song text shows its skeleton first, until it has read the stored view mode.
      await waitFor(() =>
        expect(main()?.querySelectorAll('.Verse')).toHaveLength(song.data.song.verses.length)
      );
      expect(main().querySelector('.SongLoader')).toBeNull();
      expect(document.querySelector('.AppRoot__progress')).toBeNull();
      expect(document.querySelector('.AppRoot__offline')).toBeNull();
    });

    it('tells the user they are offline when the page data cannot be loaded, and offers to go back', async () => {
      window.history.replaceState(null, '', `/${bookId}/no-such-item/`);
      const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});

      renderApp(null);
      await waitFor(() => expect(document.querySelector('.AppRoot__offline')).not.toBeNull());

      expect(document.querySelector('.AppRoot__offline h1').textContent).toBe("You're offline");
      expect(main()).toBeNull();
      expect(document.querySelector('.AppRoot__progress')).toBeNull();

      act(() => document.querySelector<HTMLButtonElement>('.AppRoot__offline button').click());
      expect(back).toHaveBeenCalledOnce();
      back.mockRestore();
    });
  });
});
