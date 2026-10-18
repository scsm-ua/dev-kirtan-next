import { AlternateURLs } from 'next/dist/lib/metadata/types/alternative-urls-types';

import { getBooksMap } from '@/lib/books';
import { getBookLocale } from '@/other/helpers';
import { getSongbookPagePath, getSongbookPath } from '@/other/paths';
import type { TSongbookPage } from '@/other/paths';

/**
 * Canonical + language alternates built from every available songbook,
 * keyed by each book's real locale.
 */
export function getAlt(
  bookId: string,
  page?: TSongbookPage
): Partial<AlternateURLs> {
  const booksMap = getBooksMap();

  const path = (id: string) =>
    page ? getSongbookPagePath(id, page) : getSongbookPath(id);

  const languages: Record<string, string> = {};

  Object.values(booksMap).forEach((book) => {
    languages[getBookLocale(book.slug)] = path(book.slug);
  });

  // Current book takes precedence for its own locale.
  languages[getBookLocale(bookId)] = path(bookId);
  languages['x-default'] = path(bookId);

  return {
    canonical: path(bookId),
    languages
  } as Partial<AlternateURLs>;
}
