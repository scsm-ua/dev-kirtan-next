import { SITE } from '@/other/constants';

import type { TContentItem } from '@/types/common';

/**
 * Root-level pages inside a songbook. Values are URL segments.
 */
export const SONGBOOK_PAGE = {
  ANALYZE: 'analyze',
  AUTHORS: 'authors',
  A_Z: 'a-z',
  CONTENTS: 'contents',
  EXPORT: 'export',
  SEARCH: 'search'
} as const;

/**/
export type TSongbookPage = (typeof SONGBOOK_PAGE)[keyof typeof SONGBOOK_PAGE];

/*
 * All paths start and end with `/` to match `trailingSlash: true`
 * in next.config.ts (prevents redirects on static hosting).
 */

/**
 * Songbook root (the book list page): `/bn/`.
 */
export function getSongbookPath(bookId: string): string {
  return `/${bookId}/`;
}

/**
 * Root page inside a songbook: `/bn/a-z/`.
 */
export function getSongbookPagePath(
  bookId: string,
  page: TSongbookPage
): string {
  return `/${bookId}/${page}/`;
}

/**
 * Song (or markdown page) item: `/bn/sri-guru-carana-padma/`.
 */
export function getSongPath(bookId: string, slug: string): string {
  return `/${bookId}/${slug}/`;
}

/**
 * Song path with `?p=N` appended when the song has page variations.
 * First page is the default and gets no query.
 */
export function getSongPathWithPage(
  bookId: string,
  song: TContentItem,
  page?: string
): string {
  if (!page) {
    page = song.page;
  }

  let path = getSongPath(bookId, song.id);

  if (song.pages?.length > 1 && song.pages[0] !== page) {
    path += `?p=${page}`;
  }

  return path;
}

/**
 * Absolute URL for sitemap/OG/JSON-LD: `https://origin/bn/a-z/`.
 */
export function getAbsoluteUrl(path: string): string {
  return SITE.ORIGIN.replace(/\/$/, '') + path;
}
