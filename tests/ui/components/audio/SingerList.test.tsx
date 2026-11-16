import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import SingerList from '@/components/audio/SingerList';
import { translate } from '@/other/i18n';
import { AUTOPLAY_PARAM, getAudioSingerPath, getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { getBookIds } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

import type { TSinger } from '@/types/audio';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const VISIBLE_COUNT = 5;

let bookId: string;
let singers: TSinger[];

beforeAll(async () => {
  for (const id of getBookIds()) {
    const page = await loadPage({ kind: 'audio', bookId: id }, 'audio');
    if (page.data.singers.length > VISIBLE_COUNT + 2) {
      bookId = id;
      singers = page.data.singers;
      break;
    }
  }
  // Guard: a real book has enough singers for the list to collapse with a centred window.
  expect(singers).toBeTruthy();
});

const rows = () => [...document.querySelectorAll('.SingerList__item')];
const linkOf = (row: Element) => row.querySelector<HTMLAnchorElement>('a.SingerList__link');
const nameOf = (row: Element) => row.querySelector('.SingerList__name').textContent;
const countOf = (row: Element) => Number(row.querySelector('.SingerList__count').textContent);
const shownSingerIndexes = () =>
  rows()
    .slice(1)
    .flatMap((row, index) => (row.classList.contains('SingerList__item--extra') ? [] : [index]));
const showAll = () => screen.queryByRole('button', { name: new RegExp(translate(bookId, 'AUDIO_PAGE.SHOW_ALL')) });

describe('SingerList', () => {
  it('lists all recordings first, then every singer with the number of recordings, linked to its playlist', () => {
    render(<SingerList bookId={bookId} singers={singers} />);
    const [all, ...rest] = rows();

    expect(nameOf(all)).toBe(translate(bookId, 'AUDIO_PAGE.ALL_RECORDINGS'));
    expect(countOf(all)).toBe(singers.reduce((sum, singer) => sum + singer.count, 0));
    expect(linkOf(all).getAttribute('href')).toBe(getSongbookPagePath(bookId, SONGBOOK_PAGE.AUDIO));
    expect(rest.map(nameOf)).toEqual(singers.map((singer) => singer.name));
    expect(rest.map(countOf)).toEqual(singers.map((singer) => singer.count));
    expect(rest.map((row) => linkOf(row).getAttribute('href'))).toEqual(
      singers.map((singer) => getAudioSingerPath(bookId, singer.id))
    );
  });

  it('marks all recordings as the current page when no singer is selected', () => {
    render(<SingerList bookId={bookId} singers={singers} />);

    expect(rows().map((row) => linkOf(row).getAttribute('aria-current'))).toEqual([
      'page',
      ...singers.map(() => null)
    ]);
    expect(rows()[0].classList.contains('SingerList__item--active')).toBe(true);
    expect(rows().map((row) => row.querySelector('.SingerList__play').tagName)).toEqual([
      'BUTTON',
      ...singers.map(() => 'A')
    ]);
  });

  it('marks the selected singer as the current page', () => {
    const selected = singers[3];
    render(<SingerList bookId={bookId} selectedId={selected.id} singers={singers} />);
    const current = rows().filter((row) => linkOf(row).getAttribute('aria-current') === 'page');

    expect(current.map(nameOf)).toEqual([selected.name]);
    expect(current[0].classList.contains('SingerList__item--active')).toBe(true);
  });

  it('plays the current page in place; every other row links to its playlist with autoplay', () => {
    const selected = singers[1];
    render(<SingerList bookId={bookId} selectedId={selected.id} singers={singers} />);

    rows().forEach((row) => {
      const href = linkOf(row).getAttribute('href');
      const play = row.querySelector('.SingerList__play');

      if (nameOf(row) === selected.name) {
        expect(play.tagName).toBe('BUTTON');
        expect(play.getAttribute('aria-label')).toBe('Play');
      } else {
        expect(play.tagName).toBe('A');
        expect(play.getAttribute('href')).toBe(`${href}?${AUTOPLAY_PARAM}=1`);
        expect(play.getAttribute('rel')).toBe('nofollow');
        expect(play.getAttribute('aria-label')).toBe('Play');
      }
    });
  });

  describe('a long list', () => {
    it(`shows ${VISIBLE_COUNT} singers and a "show all" button with the number of singers`, () => {
      render(<SingerList bookId={bookId} singers={singers} />);

      expect(shownSingerIndexes()).toEqual([0, 1, 2, 3, 4]);
      expect(showAll().getAttribute('aria-expanded')).toBe('false');
      expect(within(showAll()).getByText(String(singers.length))).toBeTruthy();
    });

    it('keeps the selected singer in view, in the middle when it can', () => {
      const problems = singers.flatMap((singer, index) => {
        const { unmount } = render(<SingerList bookId={bookId} selectedId={singer.id} singers={singers} />);
        const shown = shownSingerIndexes();
        unmount();

        const start = Math.min(Math.max(0, index - 2), singers.length - VISIBLE_COUNT);
        const expected = Array.from({ length: VISIBLE_COUNT }, (_, i) => start + i);

        return JSON.stringify(shown) === JSON.stringify(expected) ? [] : [`${singer.id} (#${index}): ${shown}`];
      });

      expect(problems).toEqual([]);
    });

    it('expands on "show all"', async () => {
      render(<SingerList bookId={bookId} singers={singers} />);
      await userEvent.click(showAll());

      expect(showAll().getAttribute('aria-expanded')).toBe('true');
      expect(document.querySelector('.SingerList__collapse--expanded')).toBeTruthy();
    });
  });

  it(`does not collapse ${VISIBLE_COUNT} singers or fewer`, () => {
    render(<SingerList bookId={bookId} singers={singers.slice(0, VISIBLE_COUNT)} />);

    expect(showAll()).toBeNull();
    expect(document.querySelector('.SingerList__item--extra')).toBeNull();
    expect(rows()).toHaveLength(VISIBLE_COUNT + 1);
  });
});
