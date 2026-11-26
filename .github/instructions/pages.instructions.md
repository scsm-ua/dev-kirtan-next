---
description: "Use when working on the markdown 'page' content type: the pages/ source JSON, the type discriminator on content items, the content-handler registry (lib/content), the page handler (load/meta/export), components/page (PageView, PageMarkdown), components/content (ContentShell, PageBody), the item branch of loadPageData, the shared [slug] route and metadata dispatch, the withPages export option, or the About page (reserved slug 'about', lib/about.ts, the info button in the header of the songbook list)."
applyTo: ["components/page/**", "components/content/**", "lib/page.ts", "lib/about.ts", "lib/content/**", "types/page.ts", "other/markdown.ts", "source/books/**/pages/**", "app/[bookId]/[slug]/page.tsx", "other/metadata/getContentMeta.ts"]
---

# Page Item Type (markdown)

A **page** is a content item that renders markdown prose instead of song verses.
Songs and pages share the same route (`/[bookId]/[slug]`) and the same flat id
namespace; the kind is distinguished by a `type` discriminator. Song and page
are **sibling types** behind a handler registry — nothing outside the two
registries branches on `ITEM_TYPE`.

## Content-handler registry (architecture)

- `lib/content/handler.ts` — `ContentHandler<TData>` contract:
  `type`, `indexEntryClass`, `load(slug, bookId)`, `getMeta(data, ctx)`,
  `renderExport(data, slug)`. **Deliberately React-free**: `lib/export.ts` is
  imported by the bare export page, and pulling components in would drag their
  SCSS into the export document's head.
- `lib/content/registry.ts` — `getContentHandler(type?)`, falls back to `song`
  (safe default for items built before the discriminator existed).
- `lib/content/song/` and `lib/content/page/` — the sibling implementations:
  `index.ts` (handler), `meta.ts`, `export.ts`; loaders stay in `lib/song.ts` /
  `lib/page.ts`. Shared export primitives (`heading`, `NAV_SPAN`) are in
  `lib/content/exportHtml.ts`.
- On the app side, the `item` route object (`lib/pageData/routes/item.tsx`)
  resolves the item type through its `ITEM_TYPES` map and returns page data of
  kind `song` or `page`; `components/app/views/registry.ts`
  (`VIEWS`) maps that kind to the body view (`SongBody` / `PageBody`). Bodies
  compose `ContentShell` (the `ContentPage__*` header block, `PageNumber`,
  `PrevNextNav`; header/footer come from the persistent `AppRoot` chrome) via
  `controls`/`headerExtra`/`after` slots. Bodies are client-safe views: they
  receive page data only, never call loaders.
- Adding a new item type = new folder in `lib/content/` + one entry in the lib
  registry + an `ITEM_TYPES` entry in `lib/pageData/routes/item.tsx` + a `TPageData` kind + a `VIEWS` entry (body view, `chrome`, `prefetch`).
  Full recipe: `app-routes.instructions.md` (Recipe C). Do not add `item.type`
  branches elsewhere.

## Data shape

- Source lives in `source/books/<bookId>/pages/<slug>.json` with shape
  `{ meta: { page?, title }, body }` (`TPage` in `types/page.ts`). **`meta.title`
  is mandatory** — it drives the header and document metadata.
- The **slug is the filename** without `.json` (same rule as songs).
- `body` is markdown (headings, lists, blockquotes, images, `\` hard breaks,
  4-space code blocks).

## Type discriminator (single source of truth)

- `TItemType = 'song' | 'page'` and the `ITEM_TYPE` constants live in
  `types/common.ts`; every content item carries `type`.
- The build derives it in `scripts/transformContents.js` `mapItem` →
  `getItemType(item)` from `path.dirname(item.filepath)` (`pages` ⇒ `'page'`).
  The JS typedef mirror is in `scripts/types.js`.
- Regenerate `contents.json` after changing the script:
  `pnpm run install:post-fetch` (only rebuilds currently-linked songbooks; other
  books without `type` fall back to `song`, which is the safe default).

## Loading & routing

- `getPageBySlug(slug, bookId)` in `lib/page.ts` mirrors `getSongBySlug`
  (reads `PATH.DIR.PAGES`, returns `null` when missing).
- `getContentItemBySlug(bookId, slug)` in `lib/contents.ts` resolves an item's
  `type` before the body is loaded.
- `app/[bookId]/[slug]/page.tsx` (`ContentPage`) is thin:
  `loadPageData({ kind: 'item', bookId, slug })` → `<AppDocument page extras>`;
  the only kind check picks the JSON-LD for `extras` (`LdJsonSong` /
  `other/metadata/LdJsonPage.tsx`: WebPage + BreadcrumbList + `Article`). The same page data is
  emitted as `/data/<bookId>/<slug>.json` for client navigation.
- `other/metadata/getContentMeta.ts` is the matching `generateMetadata`
  dispatcher (`handler.load → handler.getMeta`). The page implementation is
  `lib/content/page/meta.ts`: title/description come from `page.meta.title`.

## Rendering

- `other/markdown.ts` `renderMarkdownBody(body)` is the **single source of truth**
  for markdown → HTML (uses `marked`; pure, no React/DOM). Shared by the app view
  and the export builder so both render identically. Do not add a second parser.
- The markdown is rendered at build time in `lib/pageData/routes/item.tsx` and shipped as
  `page.data.page.bodyHtml`, so the client bundle has no markdown parser.
- `components/page/PageView/PageView.tsx` renders `bodyHtml` inside the same white
  panel songs use — it reuses `.SongText` (imports `SongText.scss`) and wraps the
  markdown in a `.PageMarkdown` container (`dangerouslySetInnerHTML`; input is
  trusted songbook source). `PageView.scss` scopes all element styling under
  `.PageMarkdown`. `components/content/PageBody.tsx` places it in `ContentShell`.
- `lib/content/page/export.ts` `renderPage` embeds the same `renderMarkdownBody`
  output in a `.PageMarkdown` div — never import `react-dom/server` into the app
  graph (Next forbids it), which is why the renderer is a plain string function.

## About page

The About page of a songbook is an ordinary page item with the reserved slug
`about` (`ABOUT_PAGE_SLUG` in `other/paths.ts`): `pages/about.md` in the
songbook repo, listed in its `contents.md`. It is optional per book and needs
nothing on the route side: it has its HTML, data file, bundle and sitemap
entry like any other page.

- **Header button:** on the songbook list (`/<book>/` and `/`) the header
  shows an info button ("i" in a circle, `.Header__about`) directly left of
  Feedback. No other page shows it.
- **Target** (`getAboutLink(bookId)` in `lib/about.ts`): the About page of
  the book; else the one of the default-language book (`DEFAULT_LANGUAGE`,
  `/en/about/`); else no button. A book qualifies when its `contents.json`
  has an item with the slug `about` and `type: 'page'`.
- **Fallback is a plain link to the `en` page.** There is no copy of the `en`
  text under `/<book>/about/`. The reader lands in the `en` chrome (logo,
  footer, interface language) and returns with the browser Back button.
  `PREFERRED_BOOK_ID` is written only by a click in `BookCard`, so `/` still
  opens their own book.
- **Label** (`aria-label`, `title`): the title the target book's
  `contents.json` lists the page with. It is in the language of the page it
  opens, so `source/translations.json` has no key for it.
- **Flow:** `loadPageData` (`book-list`) sets `data.about` (`TAboutLink`:
  `{ path, title }`) → `getChrome` passes it as `about` → `LayoutChrome` →
  `Header`. The view does no lookup (rule 1 of
  `app-architecture.instructions.md`). The `other` page has the same data
  type but no `about`.
- **Icon:** inline SVG in `Header.tsx`, not a file in `public/images/svg`
  (those are cached as shell assets).
- **Offline and caching:** the songbook list caches no book, so the button
  works offline only when the target book is cached. Opening `/en/about/`
  from another book's list starts caching the `en` book, as any visit to a
  page of a book does (`offline-mode.instructions.md`).

## Nav / search / sitemap (inherited, type-agnostic)

- Prev/next (`getNavItems` / `PrevNextNav`) is id/contents-order based — pages
  participate automatically.
- Page-number search (`lib/search.ts` `getPagesList`) already iterates every
  item's `pages`, so pages appear there.
- `app/sitemap.ts` maps every content item by id, so pages are included.

## Export (`withPages`)

- `TExportOptions.withPages` (default `true`) in `other/exportDoc.ts`, with its
  URL param in `BOOL_PARAMS` and a checkbox in `components/export/ExportToolbar.tsx`.
- `lib/content/page/export.ts` `renderPage` emits `<section class="song page" ...>`
  (`.song` keeps category retention + `onlyTranslated`; `.page` lets the filter
  drop it). TOC/index entries get the handler's `indexEntryClass` (`'page'`) so
  one `.page` removal in `filterExportBody` drops the section and its entries
  together. `lib/export.ts` dispatches via `handler.renderExport` — the emitted
  class names are a contract; keep them exactly as-is.
