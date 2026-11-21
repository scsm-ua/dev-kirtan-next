import {
  getAudioSingerPath,
  getSongbookPagePath,
  getSongbookPath,
  getSongPath,
  SONGBOOK_PAGE
} from '@/other/paths';

import type { TRoute, TRootPageKind } from '@/types/pageData';

/**
 * Page-data URL scheme, shared by the build (route handlers) and the client:
 *   /data/<bookId>/index.json            book root
 *   /data/<bookId>/<root-page>.json      contents, a-z, authors, search
 *   /data/<bookId>/<slug>.json           song or markdown page
 *   /data/<bookId>/audio/index.json      audio index
 *   /data/<bookId>/audio/<singerId>.json singer playlist
 *   /data/<bookId>/bundle.json           all of the above, for offline precaching
 */
export const DATA_ROOT = '/data/';

/** Document served by the service worker for app pages that are not cached as HTML. */
export const SHELL_PATH = '/shell/';

/**/
export function getBookBundleUrl(bookId: string): string {
  return `${DATA_ROOT}${bookId}/bundle.json`;
}

/** Name of the book-root and audio-index files. */
const INDEX_FILE = 'index';

/** Root pages served by the items handler (audio has its own, see below). */
const ITEM_ROOT_PAGES: ReadonlyArray<TRootPageKind> = [
  SONGBOOK_PAGE.CONTENTS,
  SONGBOOK_PAGE.A_Z,
  SONGBOOK_PAGE.AUTHORS,
  SONGBOOK_PAGE.OTHER,
  SONGBOOK_PAGE.SEARCH
];

/**/
export function getRouteDataUrl(route: TRoute): string {
  return `${DATA_ROOT}${route.bookId}/${getRouteFile(route)}`;
}

/**
 * File name relative to `/data/<bookId>/`; audio routes are inside `audio/`.
 */
export function getRouteFile(route: TRoute): string {
  switch (route.kind) {
    case 'book-list':
      return `${INDEX_FILE}.json`;
    case 'audio':
      return `${SONGBOOK_PAGE.AUDIO}/${INDEX_FILE}.json`;
    case 'audio-singer':
      return `${SONGBOOK_PAGE.AUDIO}/${route.singerId}.json`;
    case 'item':
      return `${route.slug}.json`;
    default:
      return `${route.kind}.json`;
  }
}

/** Page URL of a route, e.g. `/en/contents/`. */
export function getRoutePath(route: TRoute): string {
  switch (route.kind) {
    case 'book-list':
      return getSongbookPath(route.bookId);
    case 'audio-singer':
      return getAudioSingerPath(route.bookId, route.singerId);
    case 'item':
      return getSongPath(route.bookId, route.slug);
    default:
      return getSongbookPagePath(route.bookId, route.kind);
  }
}

/**
 * Route of an app page path such as `/en/contents/`, or `null` for anything
 * served as a separate document (analyze, export, test, files, legacy
 * `.html`). The root page `/` is the songbook list of the first songbook. Unknown books and slugs still parse; their data request fails and
 * the router falls back to a full load, which shows the static 404.
 */
export function parsePath(pathname: string): TRoute | null {
  if (!pathname.endsWith('/')) return null;

  const segments = pathname.split('/').filter(Boolean).map(safeDecode);
  if (segments.some((s) => !s || s.includes('.'))) return null;

  const [bookId = getFirstBookId(), page, singerId, ...rest] = segments;
  if (!bookId || NON_APP_ROOTS.has(bookId) || rest.length) return null;
  if (!page) return { kind: 'book-list', bookId };

  if (page === SONGBOOK_PAGE.AUDIO) {
    return singerId
      ? { kind: 'audio-singer', bookId, singerId }
      : { kind: 'audio', bookId };
  }
  if (singerId || NON_APP_PAGES.has(page)) return null;

  const rootPage = ITEM_ROOT_PAGES.find((kind) => kind === page);
  return rootPage
    ? { kind: rootPage, bookId }
    : { kind: 'item', bookId, slug: page };
}

/** Ids of all songbooks are a build-time constant (`next.config.ts`), in site order. */
function getFirstBookId(): string | undefined {
  return __BOOK_IDS__[0];
}

/** First path segments that are not songbooks. */
const NON_APP_ROOTS = new Set(['_next', '404', 'data', 'images', 'shell', 'test']);

/** Songbook pages that stay full document loads. */
const NON_APP_PAGES = new Set<string>([SONGBOOK_PAGE.ANALYZE, SONGBOOK_PAGE.EXPORT]);

/**/
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return '';
  }
}

/**
 * Route of a file in `/data/<bookId>/` (items handler), or `null`.
 */
export function parseItemFile(bookId: string, file: string): TRoute | null {
  const name = stripJson(file);
  if (!name) return null;
  if (name === INDEX_FILE) return { kind: 'book-list', bookId };

  const page = ITEM_ROOT_PAGES.find((kind) => kind === name);
  return page
    ? { kind: page, bookId }
    : { kind: 'item', bookId, slug: name };
}

/**
 * Route of a file in `/data/<bookId>/audio/` (audio handler), or `null`.
 */
export function parseAudioFile(bookId: string, file: string): TRoute | null {
  const name = stripJson(file);
  if (!name) return null;
  return name === INDEX_FILE
    ? { kind: 'audio', bookId }
    : { kind: 'audio-singer', bookId, singerId: name };
}

/**/
function stripJson(file: string): string {
  return file.endsWith('.json') ? file.slice(0, -'.json'.length) : '';
}
