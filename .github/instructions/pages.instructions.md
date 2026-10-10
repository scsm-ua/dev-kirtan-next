---
description: "Use when working on the markdown 'page' content type: the pages/ source JSON, the type discriminator on content items, the content-handler registry (lib/content), the page handler (load/meta/export), components/page (PageView, PageMarkdown), components/content (ContentShell, PageBody, body registry), the shared [slug] route and metadata dispatch, or the withPages export option."
applyTo: ["components/page/**", "components/content/**", "lib/page.ts", "lib/content/**", "types/page.ts", "other/markdown.ts", "source/books/**/pages/**", "app/[bookId]/[slug]/page.tsx", "other/metadata/getContentMeta.ts"]
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
- `components/content/registry.tsx` — `getContentBody(type?)` maps the type to
  a body component (`SongBody` / `PageBody`); kept apart from the lib handlers
  for the reason above. Bodies compose `ContentShell` (shared chrome: `Layout`,
  the `ContentPage__*` header block, `PageNumber`, `PrevNextNav`) via
  `controls`/`headerExtra`/`after` slots.
- Adding a new item type = new folder in `lib/content/` + one entry in each
  registry + a body component. Do not add `item.type` branches elsewhere.

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
- `app/[bookId]/[slug]/page.tsx` (`ContentPage`) is a thin dispatcher:
  `getContentItemBySlug → getContentHandler(item?.type).load →
  createElement(getContentBody(item?.type), …)`. No type branches in the route.
- `other/metadata/getContentMeta.ts` is the matching `generateMetadata`
  dispatcher (`handler.load → handler.getMeta`). The page implementation is
  `lib/content/page/meta.ts`: title/description come from `page.meta.title`.

## Rendering

- `other/markdown.ts` `renderMarkdownBody(body)` is the **single source of truth**
  for markdown → HTML (uses `marked`; pure, no React/DOM). Shared by the app view
  and the export builder so both render identically. Do not add a second parser.
- `components/page/PageView/PageView.tsx` renders the HTML inside the same white
  panel songs use — it reuses `.SongText` (imports `SongText.scss`) and wraps the
  markdown in a `.PageMarkdown` container (`dangerouslySetInnerHTML`; input is
  trusted songbook source). `PageView.scss` scopes all element styling under
  `.PageMarkdown`. `components/content/PageBody.tsx` places it in `ContentShell`.
- `lib/content/page/export.ts` `renderPage` embeds the same `renderMarkdownBody`
  output in a `.PageMarkdown` div — never import `react-dom/server` into the app
  graph (Next forbids it), which is why the renderer is a plain string function.

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
