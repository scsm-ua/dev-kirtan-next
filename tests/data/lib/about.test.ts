import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAboutLink } from '@/lib/about';
import { getContentItemBySlug } from '@/lib/contents';
import { DEFAULT_LANGUAGE } from '@/other/i18n';
import { ABOUT_PAGE_SLUG, getSongPath } from '@/other/paths';
import { getBookIds, getItems } from '@/tests/helpers/books';
import { findBook, getAboutBookId } from '@/tests/helpers/cases';

import type { TContentItem } from '@/types/common';

vi.mock('@/lib/contents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/contents')>();
  return { ...actual, getContentItemBySlug: vi.fn(actual.getContentItemBySlug) };
});

const { getContentItemBySlug: readItem } = await vi.importActual<typeof import('@/lib/contents')>('@/lib/contents');

afterEach(() => {
  vi.mocked(getContentItemBySlug).mockImplementation(readItem);
});

const linkTo = (bookId: string) => ({
  path: getSongPath(bookId, ABOUT_PAGE_SLUG),
  title: getItems(bookId).find((item) => item.id === ABOUT_PAGE_SLUG).title
});

describe('getAboutLink', () => {
  it.each(getBookIds())('leads to the About page of %s, else to the one of the default-language book', (bookId) => {
    const aboutBookId = getAboutBookId(bookId);

    expect(getAboutLink(bookId)).toEqual(aboutBookId ? linkTo(aboutBookId) : null);
  });

  it('leads to the default-language page for an unknown book', () => {
    expect(getAboutLink('no-such-book')).toEqual(linkTo(DEFAULT_LANGUAGE));
  });

  it('is null when neither the book nor the default-language book has an About page', () => {
    vi.mocked(getContentItemBySlug).mockReturnValue(null);

    expect(getAboutLink(findBook('about-of-default-book'))).toBeNull();
    expect(getAboutLink(DEFAULT_LANGUAGE)).toBeNull();
  });

  it('does not take a song with the About slug for the About page', () => {
    const bookId = findBook('about-of-default-book');
    const song = { id: ABOUT_PAGE_SLUG, title: 'A song', type: 'song' } as TContentItem;
    vi.mocked(getContentItemBySlug).mockImplementation((id, slug) =>
      id === bookId && slug === ABOUT_PAGE_SLUG ? song : readItem(id, slug)
    );

    expect(getAboutLink(bookId)).toEqual(linkTo(DEFAULT_LANGUAGE));
  });
});

describe('cases the rules above rely on', () => {
  it('real books cover both an own About page and the one of the default-language book', () => {
    expect(findBook('own-about')).toBeTruthy();
    expect(findBook('about-of-default-book')).toBeTruthy();
  });
});
