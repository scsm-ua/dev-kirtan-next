import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAboutLink } from '@/lib/about';
import { getContentItemBySlug } from '@/lib/contents';
import { DEFAULT_LANGUAGE } from '@/other/i18n';
import { ABOUT_PAGE_SLUG, getSongPath } from '@/other/paths';
import { getBookIds, getItems } from '@/tests/helpers/books';
import { getAboutBookId, hasOwnAbout } from '@/tests/helpers/cases';

import type { TContentItem } from '@/types/common';

vi.mock('@/lib/contents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/contents')>();
  return { ...actual, getContentItemBySlug: vi.fn(actual.getContentItemBySlug) };
});

const { getContentItemBySlug: readItem } = await vi.importActual<typeof import('@/lib/contents')>('@/lib/contents');

afterEach(() => {
  vi.mocked(getContentItemBySlug).mockImplementation(readItem);
});

/** A real book other than the default-language one. */
const otherBookId = getBookIds().find((id) => id !== DEFAULT_LANGUAGE);

const aboutPage = { id: ABOUT_PAGE_SLUG, title: 'About us', type: 'page' } as TContentItem;

/**
 * Inline About items: real books may have no About page at all, so the rules
 * are checked on these. `items` maps a book id to its item with the About slug.
 */
function mockAboutItems(items: Record<string, TContentItem>): void {
  vi.mocked(getContentItemBySlug).mockImplementation((id, slug) =>
    slug === ABOUT_PAGE_SLUG ? (items[id] ?? null) : readItem(id, slug)
  );
}

const inlineLinkTo = (bookId: string) => ({ path: getSongPath(bookId, ABOUT_PAGE_SLUG), title: aboutPage.title });

describe('getAboutLink', () => {
  it.each(getBookIds())('leads to the About page of %s, else to the one of the default-language book', (bookId) => {
    const aboutBookId = getAboutBookId(bookId);
    const title = aboutBookId && getItems(aboutBookId).find((item) => item.id === ABOUT_PAGE_SLUG).title;

    expect(getAboutLink(bookId)).toEqual(aboutBookId ? { path: getSongPath(aboutBookId, ABOUT_PAGE_SLUG), title } : null);
  });

  it('leads to the own About page of the book first', () => {
    mockAboutItems({ [otherBookId]: aboutPage, [DEFAULT_LANGUAGE]: { ...aboutPage, title: 'Default' } });

    expect(getAboutLink(otherBookId)).toEqual(inlineLinkTo(otherBookId));
  });

  it('leads to the About page of the default-language book when the book has none', () => {
    mockAboutItems({ [DEFAULT_LANGUAGE]: aboutPage });

    expect(getAboutLink(otherBookId)).toEqual(inlineLinkTo(DEFAULT_LANGUAGE));
  });

  it('leads to the default-language page for an unknown book', () => {
    mockAboutItems({ 'no-such-book': { ...aboutPage, title: 'Unknown' }, [DEFAULT_LANGUAGE]: aboutPage });

    expect(getAboutLink('no-such-book')).toEqual(inlineLinkTo(DEFAULT_LANGUAGE));
  });

  it('is null when neither the book nor the default-language book has an About page', () => {
    mockAboutItems({});

    expect(getAboutLink(otherBookId)).toBeNull();
    expect(getAboutLink(DEFAULT_LANGUAGE)).toBeNull();
  });

  it('does not take a song with the About slug for the About page', () => {
    mockAboutItems({
      [otherBookId]: { id: ABOUT_PAGE_SLUG, title: 'A song', type: 'song' } as TContentItem,
      [DEFAULT_LANGUAGE]: aboutPage
    });

    expect(getAboutLink(otherBookId)).toEqual(inlineLinkTo(DEFAULT_LANGUAGE));
  });
});

describe('real songbooks', () => {
  it('have the en songbook, with an About page', () => {
    expect(getBookIds()).toContain('en');
    expect(hasOwnAbout('en')).toBe(true);
  });
});
