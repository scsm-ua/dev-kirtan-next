import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import PageNumber from '@/components/song/PageNumber/PageNumber';
import { translate } from '@/other/i18n';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { openPath } from '@/tests/helpers/app';
import { findSongPage } from '@/tests/helpers/pageData';

import type { TSong } from '@/types/song';

type TFound = { bookId: string; page: string | string[] };

let single: TFound;
let several: TFound & { page: string[] };
let noPage: TFound;

async function find(description: string, matches: (page: TSong['meta']['page']) => boolean): Promise<TFound> {
  const { route, data } = await findSongPage(description, (song) => matches(song.meta.page));
  return { bookId: route.bookId, page: data.song.meta.page };
}

beforeAll(async () => {
  single = await find('one page number', (page) => typeof page === 'string' && !!page);
  several = (await find('several page numbers', Array.isArray)) as typeof several;
  noPage = await find('no page number', (page) => !page);
});

function renderNumber({ bookId, page }: TFound) {
  return render(<PageNumber bookId={bookId} label="Page" page={page} />);
}

const searchPath = (bookId: string, query: string) =>
  `${getSongbookPagePath(bookId, SONGBOOK_PAGE.SEARCH)}?p=${query}`;

describe('PageNumber', () => {
  it('renders nothing in the static HTML (no query before hydration)', () => {
    expect(renderToString(<PageNumber bookId={single.bookId} label="Page" page={single.page} />)).toBe('');
  });

  it('renders nothing for a song with no page number', () => {
    openPath('/');
    const { container } = renderNumber(noPage);

    expect(container.innerHTML).toBe('');
  });

  it('shows the page and links the label to that page on the search page', () => {
    openPath('/');
    const { container, getByRole } = renderNumber(single);
    const value = container.querySelector('.PageNumber__value');

    expect(getByRole('link', { name: 'Page' }).getAttribute('href')).toBe(searchPath(single.bookId, single.page as string));
    expect(value.textContent).toBe(single.page);
    expect(value.getAttribute('title')).toBe(translate(single.bookId, 'SONG_PAGE.PAGE_IN_PAPER_SONGBOOK'));
  });

  it('lists all pages and links to the first one', () => {
    openPath('/');
    const { container, getByRole } = renderNumber(several);

    expect(container.querySelector('.PageNumber__value').textContent).toBe(several.page.join(', '));
    expect(getByRole('link').getAttribute('href')).toBe(searchPath(several.bookId, several.page[0]));
  });

  it('links to the page in ?p= (the page the song was opened from)', () => {
    openPath(`/?p=${encodeURIComponent(several.page[1])}`);
    const { getByRole } = renderNumber(several);

    expect(getByRole('link').getAttribute('href')).toBe(searchPath(several.bookId, several.page[1]));
  });
});
