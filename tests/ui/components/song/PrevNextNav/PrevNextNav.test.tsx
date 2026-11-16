import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import PrevNextNav from '@/components/song/PrevNextNav/PrevNextNav';
import { openPath } from '@/tests/helpers/app';
import { loadSongPage } from '@/tests/helpers/pageData';

import type { TNavItemsMap } from '@/types/song';

let navMap: TNavItemsMap;
let pages: string[];

beforeAll(async () => {
  navMap = (await loadSongPage('listed-twice-with-several-pages')).data.nav;
  pages = Object.keys(navMap);

  // Guard: the song must have different neighbours on its different pages.
  expect(pages.length).toBeGreaterThan(1);
  expect(navMap[pages[0]]).not.toEqual(navMap[pages[1]]);
});

function shownLinks(container: HTMLElement) {
  return [...container.querySelectorAll('.PrevNextLink')].map((link) => ({
    path: link.getAttribute('href') ?? null,
    title: link.textContent
  }));
}

function expected(page: string) {
  const { prev, next } = navMap[page];
  return [prev, next].map((item) => (item ? { path: item.path, title: item.title } : { path: null, title: '' }));
}

describe('PrevNextNav', () => {
  it('renders nothing in the static HTML (no query before hydration)', () => {
    expect(renderToString(<PrevNextNav navMap={navMap} />)).toBe('');
  });

  it('is a named navigation landmark', () => {
    openPath('/');
    const { getByRole } = render(<PrevNextNav navMap={navMap} />);

    expect(getByRole('navigation').getAttribute('aria-label')).toBeTruthy();
  });

  it.each([0, 1])('shows the neighbours of the page in ?p= (page #%i)', (index) => {
    openPath(`/?p=${encodeURIComponent(pages[index])}`);
    const { container } = render(<PrevNextNav navMap={navMap} />);

    expect(shownLinks(container)).toEqual(expected(pages[index]));
  });

  it.each(['', '?p=no-such-page'])('falls back to the first page for "%s"', (search) => {
    openPath(`/${search}`);
    const { container } = render(<PrevNextNav navMap={navMap} />);

    expect(shownLinks(container)).toEqual(expected(pages[0]));
  });

  it('follows the address bar when ?p= changes', () => {
    openPath(`/?p=${encodeURIComponent(pages[0])}`);
    const { container } = render(<PrevNextNav navMap={navMap} />);

    openPath(`/?p=${encodeURIComponent(pages[1])}`);

    expect(shownLinks(container)).toEqual(expected(pages[1]));
  });
});
