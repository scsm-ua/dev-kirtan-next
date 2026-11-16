import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import SongBookItem from '@/components/song/OtherTranslations/SongBookItem';
import { getBookLangLabel } from '@/other/helpers';
import { loadSongPage } from '@/tests/helpers/pageData';

import type { TBookDescription } from '@/types/book';

let description: TBookDescription;
let hidden: TBookDescription;

beforeAll(async () => {
  const { descriptions } = (await loadSongPage('in-several-books')).data;
  description = descriptions.find((candidate) => !candidate.hidden);
  hidden = descriptions.find((candidate) => candidate.hidden);
  // Guard: the song is in a shown and in a hidden book.
  expect(hidden).toBeTruthy();
});

const renderItem = (props: Partial<{ description: TBookDescription; isActive: boolean }> = {}) =>
  render(
    <ul>
      <SongBookItem description={description} href="/somewhere/" {...props} />
    </ul>
  );

describe('SongBookItem', () => {
  it('links to the song in the book, with the language, title and subtitle of the book', () => {
    renderItem();
    const link = screen.getByRole('link');

    expect(link.getAttribute('href')).toBe('/somewhere/');
    expect(link.querySelector('.SongBookItem__lang').textContent).toBe(getBookLangLabel(description.slug));
    expect(link.querySelector('.SongBookItem__title').textContent).toBe(
      getBookLangLabel(description.slug) + description.title
    );
    expect(link.querySelector('.SongBookItem__subtitle').textContent).toBe(description.subtitle ?? '');
    expect(link.querySelector('.SongBookItem__title--active')).toBeNull();
  });

  it('marks the current book', () => {
    renderItem({ isActive: true });
    expect(document.querySelector('.SongBookItem__title--active')).toBeTruthy();
  });

  it('leaves out a hidden book', () => {
    renderItem({ description: hidden });
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows a hidden book to whoever asked to see hidden books', () => {
    localStorage.setItem('SHOW_HIDDEN_BOOKS', '1');
    renderItem({ description: hidden });

    expect(screen.getByRole('link')).toBeTruthy();
  });
});
