import { SONGBOOK_PAGE } from '@/other/paths';

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

/**
 * Names of the route kinds; use them instead of string literals (type
 * arguments such as `TViewProps<'authors'>` stay literals). The kind of a
 * root page is its URL segment. Page kinds that are no route kinds (`song`,
 * `page`) are in `ITEM_TYPE`.
 */
// prettier-ignore
export const ROUTE_KIND = {
  BOOK_LIST:    'book-list',
  OTHER:        SONGBOOK_PAGE.OTHER,
  CONTENTS:     SONGBOOK_PAGE.CONTENTS,
  A_Z:          SONGBOOK_PAGE.A_Z,
  AUTHORS:      SONGBOOK_PAGE.AUTHORS,
  SEARCH:       SONGBOOK_PAGE.SEARCH,
  AUDIO:        SONGBOOK_PAGE.AUDIO,
  AUDIO_SINGER: 'audio-singer',
  ITEM:         'item'
} as const;

/**
 * Every app route, by kind. This table is the only place that knows the URL
 * scheme; `TRoute` and all functions below are derived from it.
 *
 * - `path`: page path relative to `/<bookId>/`; `:name` is a route param.
 * - `file`: data file relative to `/data/<bookId>/`, without `.json`; defaults to `path`.
 * - Key order is the match priority: a fixed segment shadows a slug with the same name.
 */
// prettier-ignore
export const ROUTES = {
  [ROUTE_KIND.BOOK_LIST]:    { path: '', file: 'index' },
  [ROUTE_KIND.OTHER]:        { path: SONGBOOK_PAGE.OTHER },
  [ROUTE_KIND.CONTENTS]:     { path: SONGBOOK_PAGE.CONTENTS },
  [ROUTE_KIND.A_Z]:          { path: SONGBOOK_PAGE.A_Z },
  [ROUTE_KIND.AUTHORS]:      { path: SONGBOOK_PAGE.AUTHORS },
  [ROUTE_KIND.SEARCH]:       { path: SONGBOOK_PAGE.SEARCH },
  [ROUTE_KIND.AUDIO]:        { path: SONGBOOK_PAGE.AUDIO, file: `${SONGBOOK_PAGE.AUDIO}/index` },
  [ROUTE_KIND.AUDIO_SINGER]: { path: `${SONGBOOK_PAGE.AUDIO}/:singerId` },
  [ROUTE_KIND.ITEM]:         { path: ':slug' }  // Last: any other single segment.
} as const;

/** Params of a pattern: `'audio/:singerId'` → `{ singerId: string }`. */
type TPatternParams<P extends string> = P extends `${infer Head}/${infer Rest}`
  ? TPatternParams<Head> & TPatternParams<Rest>
  : P extends `:${infer Name}`
    ? { [K in Name]: string }
    : unknown;

type TFlat<T> = { [K in keyof T]: T[K] };

/**
 * Identifies one page-data file. `item` is a song or markdown page; its real
 * type is only known after the contents lookup, so it lives in `TPageData.kind`.
 */
export type TRoute = {
  [K in keyof typeof ROUTES]: TFlat<
    { kind: K; bookId: string } & TPatternParams<(typeof ROUTES)[K]['path']>
  >;
}[keyof typeof ROUTES];

type TRouteDef = { file?: string; path: string };

const ROUTE_LIST = Object.entries(ROUTES) as Array<[TRoute['kind'], TRouteDef]>;

/** Route kinds in table order. */
export const ROUTE_KINDS = ROUTE_LIST.map(([kind]) => kind);

const PARAM_PREFIX = ':';

/**/
function getFilePattern(def: TRouteDef): string {
  return def.file ?? def.path;
}

/**
 * Folder of the kind's data files inside `/data/<bookId>/`: `''` or `'audio'`.
 * Each folder has its own JSON handler.
 */
export function getRouteFolder(kind: TRoute['kind']): string {
  const file = getFilePattern(ROUTES[kind]);

  return file.slice(0, Math.max(file.lastIndexOf('/'), 0));
}

/**/
function splitPattern(pattern: string): Array<string> {
  return pattern ? pattern.split('/') : [];
}

/** Pattern with the params of the route filled in. */
function fillPattern(pattern: string, route: TRoute): string {
  const params = route as Record<string, string>;

  return splitPattern(pattern)
    .map((part) => (part.startsWith(PARAM_PREFIX) ? params[part.slice(PARAM_PREFIX.length)] : part))
    .join('/');
}

/** Params of the segments when they fit the pattern, or `null`. */
function matchPattern(pattern: string, segments: Array<string>): Record<string, string> | null {
  const parts = splitPattern(pattern);
  if (parts.length !== segments.length) return null;

  const params: Record<string, string> = {};

  for (const [index, part] of parts.entries()) {
    if (part.startsWith(PARAM_PREFIX)) {
      params[part.slice(PARAM_PREFIX.length)] = segments[index];
    } else if (part !== segments[index]) {
      return null;
    }
  }

  return params;
}

/** First route of the table whose pattern fits the segments, or `null`. */
function matchRoute(
  bookId: string,
  segments: Array<string>,
  getPattern: (def: TRouteDef) => string
): TRoute | null {
  for (const [kind, def] of ROUTE_LIST) {
    const params = matchPattern(getPattern(def), segments);
    if (params) return { kind, bookId, ...params } as TRoute;
  }

  return null;
}

/**/
export function getRouteDataUrl(route: TRoute): string {
  return `${DATA_ROOT}${route.bookId}/${getRouteFile(route)}`;
}

/**
 * File name relative to `/data/<bookId>/`; audio routes are inside `audio/`.
 */
export function getRouteFile(route: TRoute): string {
  return `${fillPattern(getFilePattern(ROUTES[route.kind]), route)}.json`;
}

/** Page URL of a route, e.g. `/en/contents/`. */
export function getRoutePath(route: TRoute): string {
  const path = fillPattern(ROUTES[route.kind].path, route);

  return path ? `/${route.bookId}/${path}/` : `/${route.bookId}/`;
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

  const [bookId = getFirstBookId(), ...rest] = segments;
  if (!bookId || NON_APP_ROOTS.has(bookId) || NON_APP_PAGES.has(rest[0])) return null;

  return matchRoute(bookId, rest, (def) => def.path);
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
 * Route of a file in `/data/<bookId>/`, or `null`. `file` is relative to that
 * folder and ends in `.json`: `contents.json`, `audio/index.json`.
 */
export function parseDataFile(bookId: string, file: string): TRoute | null {
  const segments = stripJson(file).split('/');
  if (segments.some((s) => !s)) return null;

  return matchRoute(bookId, segments, getFilePattern);
}

/**/
function stripJson(file: string): string {
  return file.endsWith('.json') ? file.slice(0, -'.json'.length) : '';
}
