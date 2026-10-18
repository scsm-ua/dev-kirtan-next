# Plan: render new item type `page` (markdown)

## Context (verified)

- Pages already exist as source JSON in `source/books/<bookId>/pages/` with shape
  `{ "meta": { "page": N }, "body": "<markdown>" }` — unlike songs which have `verses[]`.
- Page items are **already listed** in `contents.json` (e.g. `003_programme`, ids = filename
  without extension) and already flow into `generateStaticParams`, `sitemap`, and the
  page-number search index.
- But `lib/song.ts` `getSongBySlug` only reads the `songs/` dir, so every page slug currently
  resolves to `null` → `notFound()`. Pages are effectively broken today.
- No `type` discriminator on content items (`types/common.ts`, `scripts/types.js`). The build
  knows the kind via the raw `item.filepath` (`songs/x.md` vs `pages/x.md`) in
  `scripts/transformContents.js:133`.
- No markdown library is installed (`package.json`); only regex inline markdown in `other/utils.ts`.

## Decisions (from answers)

1. **Nav** — same forward/back as songs, by contents order (page-number order not important).
2. **Search** — pages must appear in the page-number search.
3. **Sitemap** — include pages.
4. **Title** — use `page.meta.title` from the page JSON (used for header + `<title>`/meta).
5. **Markdown** — use a **minimal** markdown lib that lets us attach our own CSS classes so the
   app and export render identically. Render the page **inside the same white panel** the song uses
   (`main` / `.SongText`).
6. **Export** — include pages in export, gated by a **new checkbox** in the export control panel.
7. **Modular** — reuse existing code, keep hardcoding to a minimum, centralize shared constants/helpers.
8. **Docs** — add a GitHub instructions file describing the pages feature.

---

## 1. Add a `type` discriminator to content items

- `scripts/transformContents.js` `mapItem` (~L228): derive `type` from
  `path.dirname(item.filepath)` → `'pages' ? 'page' : 'song'`; include `type` in the returned item.
- `scripts/types.js` `ContentItem` typedef (~L54): add `type`.
- `types/common.ts` `TContentItem`: add `type: 'song' | 'page'`.
- Regenerate `contents.json`: `pnpm run install:post-fetch`.

## 2. Types + loader for pages

- New `types/page.ts`: `TPage = { meta: { page?: string | string[]; title?: string }; body: string }`.
- New `lib/page.ts`: `getPageBySlug(slug, bookId)` reads
  `source/books/<bookId>/pages/<slug>.json` → `TPage | null`.
- Add `PATH.DIR.PAGES = 'pages'` in `other/constants.ts`.
- Title comes from `page.meta.title` (answer 4) — no heading-parsing helper needed.

## 3. Markdown rendering — `markdown-to-jsx` (minimal, class overrides)

- Add dependency `markdown-to-jsx` (single, lightweight; supports `options.overrides` to attach
  our own `className` per element → full CSS control).
- New `components/page/PageMarkdown.tsx`: wraps `<Markdown options={{ overrides: { h1, p, pre,
  blockquote, ... } }}>` mapping each tag to a classed element so styling is centralized.
- Shared SCSS (e.g. `components/page/PageView/PageView.scss`) scopes all markdown element styles
  under one container class so app + export look the same.
- **Export reuse (answer 5 + 6):** render the same markdown to an HTML string server-side via
  `react-dom/server` `renderToStaticMarkup(<PageMarkdown .../>)`, so export output is identical to
  the app. (Alternative if we want to avoid `react-dom/server` in export: a tiny `marked`-based
  string render sharing the same wrapper classes — but `markdown-to-jsx` + `renderToStaticMarkup`
  keeps a single source of truth.)

## 4. New render component (same route, unique ids)

- New `components/page/PageView/PageView.tsx` (+ `.scss`):
  - Renders inside the **same white panel** as songs — reuse the `.SongText` panel wrapper/styles
    (`components/song/SongText/SongText.tsx` / `SongText.scss`) so the page body sits in `main`.
  - Renders `<PageMarkdown>` for `page.body`.
  - Keeps page number via existing `PageNumber` and the book/language block
    (`SongPage__book` / `SongPage__info`).

## 5. Wire routing to branch on type

- `app/[bookId]/[slug]/page.tsx`:
  - Look up the content item for `slug` and read its `type`.
  - If `page`: `getPageBySlug` → render `<PageView>` inside existing `<Layout>` (pass
    `page={page.meta?.page}` so `Layout`/`PageNumber` work). Else keep current song flow.
  - `generateStaticParams` already returns page slugs (no change).
- `other/metadata/getSongPageMeta.ts`: add a `page` branch — title/description from `page.meta.title`
  (answer 4) + page number, instead of returning `null`.

## 6. Navigation (answer 1)

- `getNavItems` / `PrevNextNav` are id/contents-order based and already type-agnostic — pages
  participate in prev/next automatically. **Verify** the page-number grouping path in `getNavItems`
  falls back correctly for page items (the `_` fallback) so prev/next follows contents order.

## 7. Search by page number (answer 2)

- `lib/search.ts` `getPagesList` already iterates every content item's `item.pages`, and page
  items have `pages: [N]`, so pages should already appear in page-number search once they render.
  **Verify** the generated link (`getSongPathWithPage`) resolves to the page route.

## 8. Sitemap (answer 3)

- `app/sitemap.ts` already maps every content item by `item.id`, so pages are already included once
  they resolve (no longer 404). **Verify** after rebuild; no code change expected.

## 9. Export (answer 6)

- `other/exportDoc.ts`: add `withPages: boolean` to `TExportOptions`, to `DEFAULT_EXPORT_OPTIONS`
  (default e.g. `true`), and to `BOOL_PARAMS` (e.g. `{ key: 'withPages', param: 'pages-content' }`).
- `components/export/ExportToolbar.tsx`: add a checkbox bound to `options.withPages` →
  `onChange({ withPages: ... })`.
- `lib/export.ts` `buildExportHtml` loop: currently `getSongBySlug(item.id)` returns `null` for
  pages and `continue`s. Add: if `item.type === 'page' && options.withPages`, load via
  `getPageBySlug` and emit a `<section class="page" id="song-<id>">` whose body is the markdown
  rendered to HTML (same `PageMarkdown` → `renderToStaticMarkup`), so TOC links/nav anchors keep
  working. Respect `withPageNumbers` / `withNavLinks` like songs where sensible.
- Note: confirm `buildExportHtml` receives `options` (plumb through if not already).

## 10. Modularity (answer 7)

- **One source of truth for item kind:** a single `ITEM_TYPE` const / type union (e.g. in
  `types/common.ts`) used by the build script output, loaders, routing, and export — avoid string
  literals scattered around.
- **Shared markdown renderer:** `PageMarkdown` + its override map is the only place markdown→DOM is
  defined; both the app view and the export string path consume it (no duplicate element mappings).
- **Reuse existing building blocks:** `Layout`, `PageNumber`, the `.SongText` panel wrapper, the
  `SongPage__book`/`SongPage__info` header block, and the export `heading`/`section` helpers — don't
  re-implement layout/number/anchor logic for pages.
- **Centralize paths/dirs:** add `PATH.DIR.PAGES` and reuse it in `lib/page.ts` and the build script
  (no inline `'pages'` strings).
- **Loader symmetry:** model `getPageBySlug` after `getSongBySlug` (same signature shape, same
  null-on-missing contract) so routing/metadata branch cleanly.
- **CSS:** one scoped container class drives all markdown element styling, shared by app + export.

## 11. GitHub instructions file (answer 8)

- Add `.github/instructions/pages.instructions.md` documenting the pages feature so future edits stay
  consistent. Include:
  - `applyTo` glob covering the touched files (e.g. `components/page/**`, `lib/page.ts`,
    `types/page.ts`, `source/books/**/pages/**`, and the `type`-discriminator / export-option code).
  - A `description` (front-matter) matching the style of existing instruction files in
    `.github/instructions/` so it is auto-surfaced for relevant tasks.
  - What a page item is (`{ meta: { page, title }, body }`), where the slug comes from (filename),
    the `type: 'page'` discriminator, the shared `PageMarkdown` renderer + override map, the
    `.SongText` panel reuse, the `withPages` export option, and the nav/search/sitemap behavior.

## Out of scope / follow-up

- Full markdown feature parity (tables, images) beyond what sample pages use.
- Per-page view-mode controls (pages have no verse/translation toggles).
