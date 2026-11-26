# Plan: explicit path generator functions

## 1. New module `other/paths.ts`

**Segment constants for root-level songbook pages** (replaces `PATH.PAGE` as the source of truth):

```ts
export const SONGBOOK_PAGE = {
  ANALYZE: 'analyze',
  AUTHORS: 'authors',
  A_Z: 'a-z',
  CONTENTS: 'contents',
  EXPORT: 'export',
  SEARCH: 'search'
} as const;
export type TSongbookPage = (typeof SONGBOOK_PAGE)[keyof typeof SONGBOOK_PAGE];
```

No `BOOK_LIST` sentinel — the songbook root is its own function.

**Functions** (every returned path starts and ends with `/`, matching `trailingSlash: true`):

```ts
/** '/bn/' — songbook root (book list page of one book) */
export function getSongbookPath(bookId: string): string;

/** '/bn/a-z/' — a root page inside a songbook */
export function getSongbookPagePath(bookId: string, page: TSongbookPage): string;

/** '/bn/sri-guru-carana-padma/' — a song (or markdown page) item */
export function getSongPath(bookId: string, slug: string): string;

/** Song path + '?p=N' when the song has page variations (moved here from other/utils.ts) */
export function getSongPathWithPage(bookId: string, item: TContentItem, page?: string): string;

/** 'https://origin/bn/a-z/' — absolute URL for sitemap, OG, JSON-LD (joins SITE.ORIGIN without '//') */
export function getAbsoluteUrl(path: string): string;
```

Query (`?p=`) and hash (`#section-`) suffixes stay at call sites — page-specific concerns, keeps the API tiny. Exception: `getSongPathWithPage` owns the multi-page `?p=` logic and builds on `getSongPath`.

## 2. Migrate all consumers

| Call site | Call |
|---|---|
| `Header.tsx`, hotkeys `b`/`l` | `getSongbookPath(bookId)` |
| `Footer.tsx` (+ `?p=` suffix for search) | `getSongbookPagePath(bookId, SONGBOOK_PAGE.…)` |
| `AZ.tsx`, `Contents.tsx` | `getSongbookPagePath(…)` |
| `BookCard.tsx`, `NotFound.tsx` | `getSongbookPagePath(slug, SONGBOOK_PAGE.A_Z)` |
| `SongHeader.tsx` (+ `#section-…`) | `getSongbookPagePath(bookId, SONGBOOK_PAGE.AUTHORS)` |
| `PageNumber.tsx` (+ `?p=` query) | `getSongbookPagePath(bookId, SONGBOOK_PAGE.SEARCH)` |
| `useGlobalHotkeys.ts` `c/i/s/e/a` | `router.push(getSongbookPagePath(…))` |
| `AnalyzeTable.tsx` | book link `getSongbookPath`, row link `getSongPath` |
| `SongbookList.tsx` | `getSongPath(description.slug, slug)` |
| `ContentItem.tsx`, `lib/search.ts`, `lib/song.ts` (prev/next) | `getSongPathWithPage(…)` — import moves to paths.ts |
| `app/sitemap.ts` | `getAbsoluteUrl(getSongbookPath/PagePath/SongPath(…))` |
| `LdJson.tsx`, `LdJsonSong.tsx`, `getOG.ts` | `getAbsoluteUrl(…)` |

## 3. Metadata signature cleanups

- `getAlt(bookId, page?: TSongbookPage)` — builds canonical + language alternates internally via `getSongbookPagePath` / `getSongbookPath`.
- `getPageMeta` helper: `pagePath: string` prop becomes `page?: TSongbookPage`.
- `LdJson`: `pagePath` prop becomes `page?: TSongbookPage` (book-list page passes none).
- `getOG(bookId, description, title, path?)` — `path` becomes a full relative path (e.g. from `getSongPath`); URL built via `getAbsoluteUrl`.
- `lib/content/song/meta.ts`, `lib/content/page/meta.ts` — canonicals/languages via `getSongPath`.

## 4. Cleanup

- Delete `PATH.PAGE` from `other/constants.ts` (keep `PATH.DIR`, `PATH.IMG`).
- Remove `getSongPathWithPage` from `other/utils.ts`.
- Grep: zero remaining `PATH.PAGE` usages and hardcoded `` `/${bookId}/…` `` links.

## 5. Verify

`tsc --noEmit` + eslint on touched files.
