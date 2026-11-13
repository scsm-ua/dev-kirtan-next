import { SITE } from '@/other/constants';

import type { TContentItem } from '@/types/common';

/**
 * Root-level pages inside a songbook. Values are URL segments.
 */
export const SONGBOOK_PAGE = {
  ANALYZE: 'analyze',
  AUDIO: 'audio',
  AUTHORS: 'authors',
  A_Z: 'a-z',
  CONTENTS: 'contents',
  EXPORT: 'export',
  SEARCH: 'search'
} as const;

/**
 * Per-singer audio page sub-path: `audio/<singerId>`.
 */
export type TAudioSingerPage = `${typeof SONGBOOK_PAGE.AUDIO}/${string}`;

/**/
export type TSongbookPage =
  | (typeof SONGBOOK_PAGE)[keyof typeof SONGBOOK_PAGE]
  | TAudioSingerPage;

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

/**/
export function getAudioSingerPage(singerId: string): TAudioSingerPage {
  return `${SONGBOOK_PAGE.AUDIO}/${singerId}`;
}

/**
 * Singer audio playlist: `/bn/audio/srila-b-s-govinda-dev-goswami-maharaj/`.
 */
export function getAudioSingerPath(bookId: string, singerId: string): string {
  return getSongbookPagePath(bookId, getAudioSingerPage(singerId));
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
 * Query that makes the audio page start its first track on load.
 */
export const AUTOPLAY_PARAM = 'autoplay';

/**
 * Absolute URL for sitemap/OG/JSON-LD: `https://origin/bn/a-z/`.
 */
export function getAbsoluteUrl(path: string): string {
  return SITE.ORIGIN.replace(/\/$/, '') + path;
}
