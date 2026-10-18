---
description: "Use when adding or changing any internal link, URL, href, or navigation path: songbook root, root pages (contents, a-z, authors, search, export, analyze), song/page item links, the ?p= page query, canonical/OG/hreflang/JSON-LD URLs, or the sitemap. Covers the other/paths.ts module (SONGBOOK_PAGE, getSongbookPath, getSongbookPagePath, getSongPath, getSongPathWithPage, getAbsoluteUrl) and the trailing-slash convention."
applyTo: ["other/paths.ts"]
---

# URL Paths

All internal URLs are built by `other/paths.ts`. **Never hardcode** `` `/${bookId}/...` `` strings anywhere else — a grep for such templates must only hit `other/paths.ts`.

## The trailing-slash invariant

`next.config.ts` has `output: 'export'` + `trailingSlash: true`. Every path returned by this module **starts and ends with `/`** (e.g. `/bn/a-z/`). A query string goes *after* the trailing slash (`/bn/search/?p=12`), a hash too (`/bn/authors/#section-x`). Links without the trailing slash cause a redirect on static hosting and break canonical-URL matching.

## API

| Function | Returns | Use for |
|---|---|---|
| `getSongbookPath(bookId)` | `/bn/` | Songbook root (book list page): Header logo, Footer "Books", hotkeys `b`/`l` |
| `getSongbookPagePath(bookId, page)` | `/bn/a-z/` | Root pages; `page` is a `SONGBOOK_PAGE` constant, never a raw string |
| `getSongPath(bookId, slug)` | `/bn/sri-guru/` | Song or markdown-page item links, canonicals, hreflang alternates |
| `getSongPathWithPage(bookId, item, page?)` | `/bn/sri-guru/?p=12` | Song links from a `TContentItem` that may have page variations (contents list, search page-list, prev/next nav). Appends `?p=` **only** when the item has >1 pages and the target isn't the first (default) page |
| `getAbsoluteUrl(path)` | `https://origin/bn/a-z/` | Absolute URLs: sitemap, OpenGraph, JSON-LD. Joins `SITE.ORIGIN` without producing `//` |

`SONGBOOK_PAGE` is the single list of root-page URL segments (`analyze`, `authors`, `a-z`, `contents`, `export`, `search`). `TSongbookPage` is its value union.

## Two different `?p=` params

Do not confuse them:

- **Search page** `/bn/search/?p=12` — prefills the page-number search box. Built manually at call sites: `getSongbookPagePath(bookId, SONGBOOK_PAGE.SEARCH) + \`?p=${page}\`` (Footer, PageNumber).
- **Song page** `/bn/{slug}/?p=12` — selects a page *variation of that song*. Built only by `getSongPathWithPage`. Never reuse it for search links (wrong route, takes a `TContentItem`).

## Consumers map

- **Components**: Header, Footer, AZ, Contents, ContentItem, BookCard, NotFound, SongHeader (`+ '#section-…'`), PageNumber, SongbookList, AnalyzeTable.
- **Hotkeys**: `other/hooks/useGlobalHotkeys.ts` — all `router.push` targets; its `NON_SONG_SEGMENTS` is derived from `Object.values(SONGBOOK_PAGE)`, so adding a constant automatically excludes that segment from song-page detection.
- **Libs**: `lib/search.ts`, `lib/song.ts` (prev/next), `lib/content/page/songRefs.ts` (export HTML).
- **SEO**: `app/sitemap.ts`, `other/metadata/helpers/getAlt.ts` (takes `page?: TSongbookPage`, builds canonical + language alternates), `getOG.ts` (takes a full relative path), `getPageMeta.ts` (`page?: TSongbookPage` option), `LdJson.tsx` (`page?: TSongbookPage` prop; omitted = book root), `LdJsonSong.tsx`, `lib/content/song/meta.ts`, `lib/content/page/meta.ts`.

## Adding a new root page

1. Add the segment to `SONGBOOK_PAGE` (this also updates hotkey song-page detection).
2. Build links/`router.push` targets with `getSongbookPagePath`.
3. If indexed: add to `app/sitemap.ts` and pass `page: SONGBOOK_PAGE.X` to `getPageMeta` / `LdJson`; admin-only pages (export, analyze) stay out of both and get `noindex` robots.

## Gotchas

- `FooterItem` active-state matching strips the query string from `href` before comparing with `pathname` — keep that if touching it.
- `SITE.ORIGIN` ends with `/`; never concatenate it with a path directly — use `getAbsoluteUrl`.
- `getSongPathWithPage` falls back to `item.page` when no explicit page is passed; first page in `item.pages` produces a clean URL with no query.
