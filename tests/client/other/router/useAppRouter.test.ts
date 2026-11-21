import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PREFERENCES } from '@/other/constants';
import { getBookLocale } from '@/other/helpers';
import { useAppLocation } from '@/other/router/location';
import { navigate } from '@/other/router/navigate';
import { loadRoute } from '@/other/router/pageStore';
import { ROOT_PENDING_ATTR } from '@/other/router/pickRootBookId';
import { isInitialPage, useAppRouter } from '@/other/router/useAppRouter';
import { getBookIds, getSongItems } from '@/tests/helpers/books';
import { mockDataFetch } from '@/tests/helpers/dataServer';
import { mockLocationMethods } from '@/tests/helpers/location';
import { loadPage } from '@/tests/helpers/pageData';

import type { TPageData, TPageDataOf } from '@/types/pageData';

const [bookId] = getBookIds();
const ORIGIN = window.location.origin;
const CONTENTS_PATH = `/${bookId}/contents/`;
const LOADER_DELAY_MS = 150;

/** A song the page store has not seen yet: the store keeps its cache for the whole file. */
const songs = getSongItems(bookId);
let nextSong = 0;
const freshSlug = () => songs[nextSong++].id;

let contents: TPageDataOf<'contents'>;
let fetchMock: ReturnType<typeof mockDataFetch>;
let location: ReturnType<typeof mockLocationMethods>;
let scroller: HTMLElement;

/** The router, with the location hook next to it to see what other components are told. */
function renderRouter(initial: TPageData | null = contents) {
  return renderHook(() => ({ ...useAppRouter(initial), location: useAppLocation() }));
}

/** Adds a link to the page. */
function addLink(href: string, attributes: Record<string, string> = {}): HTMLAnchorElement {
  const link = document.body.appendChild(document.createElement('a'));
  link.href = href;
  Object.entries(attributes).forEach(([name, value]) => link.setAttribute(name, value));
  return link;
}

/** Clicks a link; tells whether the router took the click over from the browser. */
function click(link: HTMLAnchorElement, init: MouseEventInit = {}): boolean {
  let isIntercepted = false;
  window.addEventListener(
    'click',
    (e) => {
      isIntercepted = e.defaultPrevented;
      // jsdom cannot follow links.
      e.preventDefault();
    },
    { once: true }
  );
  act(() => {
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, cancelable: true, ...init }));
  });

  return isIntercepted;
}

const dataUrl = (file: string) => `/data/${bookId}/${file}.json`;

beforeAll(async () => {
  contents = await loadPage({ kind: 'contents', bookId }, 'contents');
});

beforeEach(() => {
  window.history.replaceState(null, '', CONTENTS_PATH);
  document.title = 'Document title';
  scroller = document.body.appendChild(document.createElement('div'));
  scroller.className = 'Layout__content';

  fetchMock = mockDataFetch();
  location = mockLocationMethods();
  // jsdom has no layout.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  delete Element.prototype.scrollIntoView;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useAppRouter', () => {
  it('shows the page the document came with, without a request', () => {
    const { result } = renderRouter();

    expect(result.current.page).toBe(contents);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFailed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('a click on an internal link', () => {
    it('loads the page data and shows the page, without loading a document', async () => {
      const { result } = renderRouter();
      const entries = window.history.length;

      expect(click(addLink(`/${bookId}/a-z/`))).toBe(true);
      await waitFor(() => expect(result.current.page.kind).toBe('a-z'));

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(dataUrl('a-z'));
      expect(window.location.pathname).toBe(`/${bookId}/a-z/`);
      expect(window.history.length).toBe(entries + 1);
      expect(result.current.isLoading).toBe(false);
      expect(location.assign).not.toHaveBeenCalled();
    });

    it('brings the head, the location hook and the scroll position in line with the new page', async () => {
      const { result } = renderRouter();
      scroller.scrollTop = 120;

      click(addLink(`/${bookId}/authors/`));
      await waitFor(() => expect(result.current.page.kind).toBe('authors'));

      expect(document.title).toBe(result.current.page.head.title);
      expect(result.current.location.pathname).toBe(`/${bookId}/authors/`);
      expect(scroller.scrollTop).toBe(0);
    });

    it('scrolls to the element that the link names', async () => {
      const target = document.body.appendChild(document.createElement('h2'));
      target.id = 'section-x';
      const { result } = renderRouter();
      const slug = freshSlug();

      click(addLink(`/${bookId}/${slug}/#section-x`));
      await waitFor(() => expect(result.current.page.kind).toBe('song'));

      expect(target.scrollIntoView).toHaveBeenCalledOnce();
      expect(window.location.hash).toBe('#section-x');
    });

    it('gives every history entry its own key', async () => {
      const { result } = renderRouter();
      const firstKey = window.history.state.__kirtanKey;

      click(addLink(`/${bookId}/${freshSlug()}/`));
      await waitFor(() => expect(result.current.page.kind).toBe('song'));

      expect(firstKey).toBeTruthy();
      expect(window.history.state.__kirtanKey).toBeTruthy();
      expect(window.history.state.__kirtanKey).not.toBe(firstKey);
    });

    it('only changes the URL when the link leads to the same page with another query', async () => {
      const { result } = renderRouter();

      expect(click(addLink(`${CONTENTS_PATH}?p=2`))).toBe(true);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(window.location.search).toBe('?p=2');
      expect(result.current.location.search.get('p')).toBe('2');
      expect(result.current.page).toBe(contents);
    });

    it.each([
      ['with Ctrl', {}, { ctrlKey: true }],
      ['with Cmd', {}, { metaKey: true }],
      ['with Shift', {}, { shiftKey: true }],
      ['with Alt', {}, { altKey: true }],
      ['with the middle button', {}, { button: 1 }],
      ['on a link that opens a new tab', { target: '_blank' }, {}],
      ['on a download link', { download: '' }, {}]
    ])('is left to the browser %s', (_name, attributes, init) => {
      renderRouter();

      expect(click(addLink(`/${bookId}/a-z/`, attributes), init)).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ['a page outside the app', `/${bookId}/export/`],
      ['a file', `/${bookId}/some-song.html`],
      ['another site', 'https://example.com/en/contents/'],
      ['a place on the same page', `${CONTENTS_PATH}#top`]
    ])('is left to the browser when it leads to %s', (_name, href) => {
      renderRouter();

      expect(click(addLink(href))).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('falls back to loading the document when the page data cannot be loaded', async () => {
      const { result } = renderRouter();

      click(addLink(`/${bookId}/no-such-item/`));
      await waitFor(() => expect(location.assign).toHaveBeenCalled());

      expect(location.assign).toHaveBeenCalledExactlyOnceWith(`${ORIGIN}/${bookId}/no-such-item/`);
      expect(result.current.page).toBe(contents);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('navigate()', () => {
    it('shows the page', async () => {
      const { result } = renderRouter();
      const slug = freshSlug();

      act(() => navigate(`/${bookId}/${slug}/`));
      await waitFor(() => expect(result.current.page.kind).toBe('song'));

      expect(window.location.pathname).toBe(`/${bookId}/${slug}/`);
    });

    it('replaces the current history entry when asked to', async () => {
      const { result } = renderRouter();
      const entries = window.history.length;
      const slug = freshSlug();

      act(() => navigate(`/${bookId}/${slug}/`, { replace: true }));
      await waitFor(() => expect(result.current.page.kind).toBe('song'));

      expect(window.history.length).toBe(entries);
      expect(window.location.pathname).toBe(`/${bookId}/${slug}/`);
    });

    it('loads a document again once the router is gone', () => {
      renderRouter().unmount();

      navigate(`/${bookId}/a-z/`);

      expect(location.assign).toHaveBeenCalledExactlyOnceWith(`${ORIGIN}/${bookId}/a-z/`);
    });
  });

  describe('back and forward', () => {
    it('shows the page of the entry and restores its scroll position', async () => {
      const { result } = renderRouter();
      scroller.scrollTop = 120;
      click(addLink(`/${bookId}/${freshSlug()}/`));
      await waitFor(() => expect(result.current.page.kind).toBe('song'));
      scroller.scrollTop = 40;

      act(() => window.history.back());
      await waitFor(() => expect(result.current.page.kind).toBe('contents'));

      expect(scroller.scrollTop).toBe(120);
      expect(result.current.location.pathname).toBe(CONTENTS_PATH);

      act(() => window.history.forward());
      await waitFor(() => expect(result.current.page.kind).toBe('song'));

      expect(scroller.scrollTop).toBe(40);
    });

    it('loads nothing when only the query of the page changed', async () => {
      const { result } = renderRouter();
      click(addLink(`${CONTENTS_PATH}?p=2`));

      act(() => window.history.back());
      await waitFor(() => expect(result.current.location.search.get('p')).toBeNull());

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.page).toBe(contents);
      expect(location.reload).not.toHaveBeenCalled();
    });

    it('reloads the document when the page data of the entry cannot be loaded', async () => {
      renderRouter();

      act(() => {
        window.history.replaceState({ __kirtanKey: 'some-key' }, '', `/${bookId}/no-such-item/`);
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
      });

      await waitFor(() => expect(location.reload).toHaveBeenCalledOnce());
      expect(location.assign).not.toHaveBeenCalled();
    });
  });

  describe('slow page data', () => {
    /** Makes the next request wait until `answer()` is called. */
    function holdNextRequest() {
      let answer: () => void;
      const gate = new Promise<void>((resolve) => (answer = resolve));
      const respond = fetchMock.getMockImplementation();
      fetchMock.mockImplementationOnce(async (input) => {
        await gate;
        return respond(input);
      });

      return () => answer();
    }

    it('shows the loading state only after a short delay, until the page arrives', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { result } = renderRouter();
      const answer = holdNextRequest();

      click(addLink(`/${bookId}/${freshSlug()}/`));
      await act(() => vi.advanceTimersByTimeAsync(LOADER_DELAY_MS - 1));
      expect(result.current.isLoading).toBe(false);

      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(result.current.isLoading).toBe(true);

      vi.useRealTimers();
      answer();
      await waitFor(() => expect(result.current.page.kind).toBe('song'));
      expect(result.current.isLoading).toBe(false);
    });

    it('shows the page of the last navigation when an earlier one answers later', async () => {
      const { result } = renderRouter();
      const answerFirst = holdNextRequest();
      const slow = freshSlug();

      click(addLink(`/${bookId}/${slow}/`));
      click(addLink(`/${bookId}/a-z/`));
      await waitFor(() => expect(result.current.page.kind).toBe('a-z'));

      answerFirst();
      // The store shares the request, so this resolves right after the router got its answer.
      await act(async () => {
        await loadRoute({ kind: 'item', bookId, slug: slow });
      });

      expect(result.current.page.kind).toBe('a-z');
      expect(window.location.pathname).toBe(`/${bookId}/a-z/`);
    });
  });

  describe('prefetching', () => {
    it('loads the page data of a link when the pointer comes over it', async () => {
      const { result } = renderRouter();
      const slug = freshSlug();
      const link = addLink(`/${bookId}/${slug}/`);

      link.dispatchEvent(new Event('pointerover', { bubbles: true }));
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(dataUrl(slug));

      click(link);
      await waitFor(() => expect(result.current.page.kind).toBe('song'));
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it.each([
      ['the current page', CONTENTS_PATH],
      ['a page outside the app', `/${bookId}/export/`],
      ['another site', 'https://example.com/en/contents/']
    ])('loads nothing for a link to %s', (_name, href) => {
      renderRouter();

      addLink(href).dispatchEvent(new Event('pointerover', { bubbles: true }));

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('loads the neighbours of a song a second after the song is shown', async () => {
      const slug = songs[songs.length - 2].id;
      const song = await loadPage({ kind: 'item', bookId, slug }, 'song');
      const neighbours = Object.values(song.data.nav).flatMap(({ prev, next }) => [prev, next]);
      const expected = neighbours.flatMap((item) => (item ? [dataUrl(item.path.split('/')[2])] : []));
      window.history.replaceState(null, '', `/${bookId}/${slug}/`);
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      renderRouter(song);
      vi.advanceTimersByTime(999);
      expect(fetchMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);

      expect(expected.length).toBeGreaterThan(0);
      expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([...new Set(expected)].sort());
    });
  });

  describe('on the root page', () => {
    // The page store keeps what it loaded for the whole file, so a book that must fail is one not loaded before.
    const [firstBookId, otherBookId, failingBookId, failingShellBookId] = getBookIds();
    const listUrl = (id: string) => `/data/${id}/index.json`;
    let firstList: TPageDataOf<'book-list'>;

    beforeAll(async () => {
      firstList = await loadPage({ kind: 'book-list', bookId: firstBookId }, 'book-list');
    });

    beforeEach(() => {
      window.history.replaceState(null, '', '/');
      document.documentElement.setAttribute(ROOT_PENDING_ATTR, '');
      Object.defineProperty(navigator, 'language', { configurable: true, value: 'ja-JP' });
    });

    afterEach(() => {
      localStorage.clear();
      document.documentElement.removeAttribute(ROOT_PENDING_ATTR);
      delete (navigator as { language?: string }).language;
    });

    const isPending = () => document.documentElement.hasAttribute(ROOT_PENDING_ATTR);

    it('only changes the URL to the first songbook when that is the reader\'s book', async () => {
      const entries = window.history.length;
      const { result } = renderRouter(firstList);
      await waitFor(() => expect(window.location.pathname).toBe(`/${firstBookId}/`));

      expect(result.current.page).toBe(firstList);
      expect(result.current.location.pathname).toBe(`/${firstBookId}/`);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(window.history.length).toBe(entries);
      expect(isPending()).toBe(false);
      expect(location.assign).not.toHaveBeenCalled();
    });

    it('keeps the query and the hash', async () => {
      window.history.replaceState(null, '', '/?utm=1#top');
      renderRouter(firstList);
      await waitFor(() => expect(window.location.pathname).toBe(`/${firstBookId}/`));

      expect(window.location.search + window.location.hash).toBe('?utm=1#top');
    });

    it('moves to the songbook the reader chose before, in place of the root entry, without a document load', async () => {
      localStorage.setItem(PREFERENCES.PREFERRED_BOOK_ID, otherBookId);
      const entries = window.history.length;
      const { result } = renderRouter(firstList);
      await waitFor(() => expect(result.current.page?.route).toEqual({ kind: 'book-list', bookId: otherBookId }));

      expect(window.location.pathname).toBe(`/${otherBookId}/`);
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(listUrl(otherBookId));
      expect(window.history.length).toBe(entries);
      expect(document.title).toBe(result.current.page.head.title);
      expect(isPending()).toBe(false);
      expect(location.assign).not.toHaveBeenCalled();
    });

    it('moves to the songbook in the language of the browser', async () => {
      Object.defineProperty(navigator, 'language', { configurable: true, value: `${getBookLocale(otherBookId)}-XX` });
      const { result } = renderRouter(firstList);
      await waitFor(() => expect(result.current.page?.route.bookId).toBe(otherBookId));

      expect(window.location.pathname).toBe(`/${otherBookId}/`);
    });

    it('stays on the first songbook when the reader\'s book cannot be loaded', async () => {
      localStorage.setItem(PREFERENCES.PREFERRED_BOOK_ID, failingBookId);
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { result } = renderRouter(firstList);
      await waitFor(() => expect(window.location.pathname).toBe(`/${firstBookId}/`));

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/data/${failingBookId}/index.json`);
      expect(result.current.page).toBe(firstList);
      expect(result.current.isFailed).toBe(false);
      expect(isPending()).toBe(false);
      expect(location.assign).not.toHaveBeenCalled();
    });

    describe('in the offline shell document', () => {
      it('loads the reader\'s songbook', async () => {
        localStorage.setItem(PREFERENCES.PREFERRED_BOOK_ID, otherBookId);
        const { result } = renderRouter(null);
        await waitFor(() => expect(result.current.page?.route).toEqual({ kind: 'book-list', bookId: otherBookId }));

        expect(window.location.pathname).toBe(`/${otherBookId}/`);
        expect(result.current.isFailed).toBe(false);
      });

      it('loads the first songbook when the reader\'s book cannot be loaded', async () => {
        localStorage.setItem(PREFERENCES.PREFERRED_BOOK_ID, failingShellBookId);
        fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        const { result } = renderRouter(null);
        await waitFor(() => expect(result.current.page?.route).toEqual({ kind: 'book-list', bookId: firstBookId }));

        expect(window.location.pathname).toBe(`/${firstBookId}/`);
        expect(result.current.isFailed).toBe(false);
        expect(isPending()).toBe(false);
        expect(location.assign).not.toHaveBeenCalled();
      });
    });
  });

  describe('in the offline shell document', () => {
    it('loads the page of the current URL', async () => {
      const slug = freshSlug();
      window.history.replaceState(null, '', `/${bookId}/${slug}/`);

      const { result } = renderRouter(null);
      expect(result.current.page).toBeNull();
      await waitFor(() => expect(result.current.page?.kind).toBe('song'));

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(dataUrl(slug));
      expect(result.current.isFailed).toBe(false);
      expect(document.title).toBe(result.current.page.head.title);
    });

    it.each([
      ['its page data cannot be loaded', `/${bookId}/no-such-item/`],
      ['the URL is not an app page', '/shell/']
    ])('reports a failure when %s', async (_name, path) => {
      window.history.replaceState(null, '', path);

      const { result } = renderRouter(null);
      await waitFor(() => expect(result.current.isFailed).toBe(true));

      expect(result.current.page).toBeNull();
      expect(location.assign).not.toHaveBeenCalled();
    });
  });
});

describe('isInitialPage', () => {
  it('tells whether a page is the one the document was rendered with', async () => {
    const other = await loadPage({ kind: 'a-z', bookId }, 'a-z');

    expect(isInitialPage(contents, contents)).toBe(true);
    expect(isInitialPage({ ...contents }, contents)).toBe(true);
    expect(isInitialPage(other, contents)).toBe(false);
    expect(isInitialPage(contents, null)).toBe(false);
  });
});
