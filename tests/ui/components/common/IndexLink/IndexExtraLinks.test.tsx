import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import IndexExtraLinks from '@/components/common/IndexLink/IndexExtraLinks';
import { getSongbookPagePath, getSongPath, SONGBOOK_PAGE } from '@/other/paths';
import { getBooksMap } from '@/tests/helpers/books';

import type { TShortcut } from '@/types/book';

const bookWithShortcuts = Object.values(getBooksMap()).find((book) => book.shortcuts?.length);
const shortcuts: TShortcut[] = bookWithShortcuts?.shortcuts ?? [];
const bookId = bookWithShortcuts?.slug;

function links(hasAudio: boolean, list: TShortcut[]) {
  const { container } = render(
    <ul>
      <IndexExtraLinks bookId={bookId} hasAudio={hasAudio} shortcuts={list} />
    </ul>
  );

  return [...container.querySelectorAll('.IndexLink')].map((li) => ({
    href: li.querySelector('a').getAttribute('href'),
    compact: li.classList.contains('IndexLink--compact')
  }));
}

describe('IndexExtraLinks', () => {
  it('a real book has shortcuts', () => {
    expect(shortcuts.length).toBeGreaterThan(0);
  });

  it('renders nothing without audio and shortcuts', () => {
    expect(links(false, [])).toEqual([]);
  });

  it('lists the audio page first, then the shortcuts; all but the last are compact', () => {
    const audio = getSongbookPagePath(bookId, SONGBOOK_PAGE.AUDIO);
    const shortcutLinks = shortcuts.map(({ slug }) => getSongPath(bookId, slug));
    const hrefs = [audio, ...shortcutLinks];

    expect(links(true, shortcuts)).toEqual(hrefs.map((href, index) => ({ href, compact: index < hrefs.length - 1 })));
  });

  it('shows only the audio link, not compact, when there are no shortcuts', () => {
    expect(links(true, [])).toEqual([{ href: getSongbookPagePath(bookId, SONGBOOK_PAGE.AUDIO), compact: false }]);
  });

  it('shows the shortcut titles', () => {
    const { getAllByRole } = render(
      <ul>
        <IndexExtraLinks bookId={bookId} hasAudio={false} shortcuts={shortcuts} />
      </ul>
    );

    expect(getAllByRole('link').map((link) => link.textContent)).toEqual(shortcuts.map(({ title }) => title));
  });
});
