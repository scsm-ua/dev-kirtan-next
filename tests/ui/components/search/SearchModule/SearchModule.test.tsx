import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import SearchModule from '@/components/search/SearchModule/SearchModule';
import { translate } from '@/other/i18n';
import { navigate } from '@/other/router/navigate';
import { openPath } from '@/tests/helpers/app';
import { getBookIds } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

import type { TSearchResultItem } from '@/components/search/SearchModule/types';
import type { TPage } from '@/types/search';

vi.mock('@/other/router/navigate', () => ({ navigate: vi.fn() }));

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const navigateMock = vi.mocked(navigate);
const isNumeric = (query: string) => /^\d+$/.test(query);
const pagesFrom = (pages: TPage[], query: string) => pages.filter((p) => p.page.startsWith(query));

type TCase = { bookId: string; pages: TPage[]; single: string; exact: string; none: string };
let data: TCase;

beforeAll(async () => {
  for (const bookId of getBookIds()) {
    const { pages } = (await loadPage({ kind: 'search', bookId }, 'search')).data;
    const prefixes = [...new Set(pages.flatMap((p) => [...p.page].map((_, i) => p.page.slice(0, i + 1))))].filter(
      isNumeric
    );
    // Typed digits that lead to one page only, to a page that also starts other pages, and to nothing.
    const single = prefixes.find((q) => pagesFrom(pages, q).length === 1);
    const exact = prefixes.find((q) => pagesFrom(pages, q).length > 1 && pages.some((p) => p.page === q));
    const none = ['0', '9999', '99999'].find((q) => pagesFrom(pages, q).length === 0);

    if (single && exact && none) {
      data = { bookId, pages, single, exact, none };
      break;
    }
  }
  // Guard: a real book has pages for every case below.
  expect(data).toBeTruthy();
});

const t = (key: string) => translate(data.bookId, `SEARCH_PAGE.${key}`);
const input = () => screen.getByPlaceholderText<HTMLInputElement>(t('INPUT_PLACEHOLDER'));
const shownPages = () => [...document.querySelectorAll('.PageList__buttonText')].map((el) => el.textContent);
const pendingPages = () =>
  [...document.querySelectorAll('.PageList__button--pending')].map((el) => el.textContent);
const numpad = () => document.querySelector('.SearchControls__numpad');
const resultLinks = () => [...document.querySelectorAll('.SearchResults a')].map((a) => a.getAttribute('href'));
const pageOf = (page: string) => data.pages.find((p) => p.page === page);

const makeResults = (from: number, count: number): TSearchResultItem[] =>
  Array.from({ length: count }, (_, i) => ({
    htmlFormattedUrl: '',
    htmlSnippet: `<i>snippet ${from + i}</i>`,
    htmlTitle: `<b>title ${from + i}</b>`,
    link: `https://example.org/${from + i}/`
  }));

/** Google answers: `total` results, 10 per request, as `lookFor` asks for them. */
function answerSearch(total: number) {
  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    const start = Number(new URL(String(url)).searchParams.get('start'));
    const count = Math.max(0, Math.min(10, total - start + 1));

    return Response.json({
      items: count ? makeResults(start, count) : undefined,
      searchInformation: { totalResults: String(total) }
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderModule() {
  render(<SearchModule bookId={data.bookId} pages={data.pages} />);
}

beforeEach(() => {
  navigateMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SearchModule', () => {
  describe('as it opens', () => {
    it('has the input in focus, named buttons and every page of the book, linked to its song', () => {
      renderModule();

      expect(document.activeElement).toBe(input());
      expect(screen.getByTitle(t('FIND')).tagName).toBe('BUTTON');
      expect(screen.getByTitle(t('CLEAR')).tagName).toBe('BUTTON');
      expect(shownPages()).toEqual(data.pages.map((p) => p.page));
      expect([...document.querySelectorAll('.PageList a')].map((a) => a.getAttribute('href'))).toEqual(
        data.pages.map((p) => p.path)
      );
      expect(document.querySelector('.SearchResults')).toBeNull();
    });

    it('marks the page from ?p= in the address bar', () => {
      const [, page] = data.pages;
      openPath(`/${data.bookId}/search/?p=${encodeURIComponent(page.page)}`);
      renderModule();

      expect([...document.querySelectorAll('.PageList__button--active')].map((el) => el.textContent)).toEqual([
        page.page
      ]);
    });
  });

  describe('typing a page number', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('lists only the pages that start with the digits', () => {
      renderModule();
      fireEvent.change(input(), { target: { value: data.exact } });

      expect(shownPages()).toEqual(pagesFrom(data.pages, data.exact).map((p) => p.page));
    });

    it('opens the only matching page after a second', () => {
      renderModule();
      fireEvent.change(input(), { target: { value: data.single } });
      const [match] = pagesFrom(data.pages, data.single);

      expect(pendingPages()).toEqual([match.page]);
      act(() => vi.advanceTimersByTime(999));
      expect(navigateMock).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(navigateMock).toHaveBeenCalledExactlyOnceWith(match.path);
    });

    it('opens the exactly matching page after two seconds when other pages also match', () => {
      renderModule();
      fireEvent.change(input(), { target: { value: data.exact } });

      expect(pendingPages()).toEqual([data.exact]);
      act(() => vi.advanceTimersByTime(1999));
      expect(navigateMock).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(navigateMock).toHaveBeenCalledExactlyOnceWith(pageOf(data.exact).path);
    });

    it('opens nothing when no page matches', () => {
      renderModule();
      fireEvent.change(input(), { target: { value: data.none } });
      act(() => vi.advanceTimersByTime(5000));

      expect(shownPages()).toEqual([]);
      expect(pendingPages()).toEqual([]);
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('starts over on the next digit: only the last match is opened', () => {
      renderModule();
      fireEvent.change(input(), { target: { value: data.exact } });
      act(() => vi.advanceTimersByTime(1500));
      fireEvent.change(input(), { target: { value: data.single } });
      act(() => vi.advanceTimersByTime(1000));

      expect(navigateMock).toHaveBeenCalledExactlyOnceWith(pagesFrom(data.pages, data.single)[0].path);
    });

    it('cancels the pending page and empties the input on clear', () => {
      renderModule();
      fireEvent.change(input(), { target: { value: data.single } });
      fireEvent.click(screen.getByTitle(t('CLEAR')));
      act(() => vi.advanceTimersByTime(5000));

      expect(navigateMock).not.toHaveBeenCalled();
      expect(input().value).toBe('');
      expect(pendingPages()).toEqual([]);
      expect(shownPages()).toEqual(data.pages.map((p) => p.page));
    });

    it('cancels the pending page when the module goes away', () => {
      const { unmount } = render(<SearchModule bookId={data.bookId} pages={data.pages} />);
      fireEvent.change(input(), { target: { value: data.single } });
      unmount();
      act(() => vi.advanceTimersByTime(5000));

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('adds the digits pressed on the number pad to the input', () => {
      renderModule();
      const digits = data.exact.split('');

      expect([...numpad().querySelectorAll('button')].map((b) => b.textContent)).toEqual(
        '1234567890'.split('')
      );
      digits.forEach((digit) => fireEvent.click(within(numpad() as HTMLElement).getByRole('button', { name: digit })));

      expect(input().value).toBe(data.exact);
      expect(pendingPages()).toEqual([data.exact]);
    });

    it('opens the exactly matching page at once on Enter, without a search', () => {
      const fetchMock = answerSearch(0);
      renderModule();
      fireEvent.change(input(), { target: { value: data.exact } });
      fireEvent.keyDown(input(), { key: 'Enter' });

      expect(navigateMock).toHaveBeenCalledExactlyOnceWith(pageOf(data.exact).path);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('searching text', () => {
    it('does nothing for an empty query', async () => {
      const fetchMock = answerSearch(5);
      renderModule();
      await userEvent.click(screen.getByTitle(t('FIND')));

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('asks Google on Enter and shows the results instead of the page list and the number pad', async () => {
      const fetchMock = answerSearch(3);
      renderModule();
      await userEvent.type(input(), 'krishna{Enter}');

      await waitFor(() => expect(resultLinks()).toHaveLength(3));
      expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('q')).toBe('krishna');
      expect(resultLinks()).toEqual(makeResults(1, 3).map((r) => r.link));
      expect(document.querySelector('.SearchResults__title').innerHTML).toBe('<b>title 1</b>');
      expect(document.querySelector('.SearchResults__text').innerHTML).toBe('<i>snippet 1</i>');
      expect(document.querySelector('.PageList')).toBeNull();
      expect(numpad()).toBeNull();
      expect(screen.queryByText(t('LOAD_MORE'))).toBeNull();
    });

    it('a number that is no page is searched as text', async () => {
      const fetchMock = answerSearch(1);
      renderModule();
      fireEvent.change(input(), { target: { value: data.none } });
      await userEvent.click(screen.getByTitle(t('FIND')));

      await waitFor(() => expect(resultLinks()).toHaveLength(1));
      expect(navigateMock).not.toHaveBeenCalled();
      expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('q')).toBe(data.none);
    });

    it('loads the next ten on "load more" and appends them, until all are shown', async () => {
      const fetchMock = answerSearch(23);
      renderModule();
      await userEvent.type(input(), 'krishna{Enter}');
      const more = () => screen.queryByRole('button', { name: t('LOAD_MORE') });

      await waitFor(() => expect(resultLinks()).toHaveLength(10));
      await userEvent.click(more());
      await waitFor(() => expect(resultLinks()).toHaveLength(20));
      await userEvent.click(more());
      await waitFor(() => expect(resultLinks()).toHaveLength(23));

      expect(more()).toBeNull();
      expect(resultLinks()).toEqual(makeResults(1, 23).map((r) => r.link));
      expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('start'))).toEqual([
        '1',
        '11',
        '21'
      ]);
    });

    it('says when nothing was found', async () => {
      answerSearch(0);
      renderModule();
      await userEvent.type(input(), 'nothing{Enter}');

      expect(await screen.findByText(t('NO_RESULTS'))).toBeTruthy();
      expect(document.querySelector('.PageList')).toBeNull();
      expect(numpad()).toBeNull();
      expect(resultLinks()).toEqual([]);
    });

    it('a cleared search shows the page list and the number pad again', async () => {
      answerSearch(3);
      renderModule();
      await userEvent.type(input(), 'krishna{Enter}');
      await waitFor(() => expect(resultLinks()).toHaveLength(3));
      await userEvent.click(screen.getByTitle(t('CLEAR')));

      expect(resultLinks()).toEqual([]);
      expect(shownPages()).toEqual(data.pages.map((p) => p.page));
      expect(numpad()).not.toBeNull();
    });

    it('stops loading and keeps the page usable when the request fails', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      renderModule();
      await userEvent.type(input(), 'krishna{Enter}');

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(shownPages()).toEqual(data.pages.map((p) => p.page));
      consoleError.mockRestore();
    });
  });
});
