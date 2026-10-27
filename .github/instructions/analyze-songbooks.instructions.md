---
description: "Use when modifying the 'analyze songbooks' admin page: the cross-songbook song matrix at /[bookId]/analyze, the getAnalyzeData builder in lib/analyze.ts, the AnalyzeTable client component (sorting, hiding songbooks, counts), its full-viewport SCSS layout, or the 'a' global hotkey that opens the page."
applyTo: ["lib/analyze.ts", "components/analyze/**", "app/[bookId]/analyze/**"]
---

# Analyze Songbooks (admin page)

Admin-only matrix of all songs across all songbooks: rows = songs (keyed by
slug, which is shared across books), columns = songbooks. Opened with the `a`
global hotkey → `/{bookId}/analyze`. Not linked from any menu; `robots:
noindex` in page metadata.

## Architecture

```
app/[bookId]/analyze/page.tsx      server route (generateStaticParams = getBookIdParamList)
        │ getAnalyzeData(bookId)
        ▼
lib/analyze.ts                     React-free data builder (TAnalyzeData)
        │ props
        ▼
components/analyze/AnalyzeTable.tsx  'use client' — sorting / hiding state
components/analyze/AnalyzeTable.scss layout + table chrome
```

## Data layer — `lib/analyze.ts`

`getAnalyzeData(currentBookId)` returns `{ books, rows }`:

- **books**: all books from `getBooksMap()` (hidden ones included), ordered
  **current book first**, rest by `sort_order`.
- **rows**: one `TAnalyzeRow` per song slug, built by walking books in that
  order over `getContentsByBookId` (contents.json), keeping only
  `type === ITEM_TYPE.SONG` items.
  - `firstLine` = `aliasName` from the **first book (by column order)**
    containing the song.
  - `cells[bookId]` = `{ page?: string; translated: boolean }` when present
    (page = joined `pages` array or single `page`, `undefined` for page-less
    books; `translated` = `item.has.translation`), absent key = song not in
    that book.
- Rows are **pre-sorted by first line on the server** via `compareFirstLines`
  from `scripts/compareHelpers.js` (same comparator as the A-Z and authors
  build scripts).

**GOTCHA (hydration)**: the client must NOT re-run `localeCompare` for the
default order — Node and browser collation differ, which caused a hydration
mismatch. `AnalyzeTable` reuses the server-sorted array as-is for
`firstLine`-asc and plain-`reverse()`s it for desc. Keep any new default-order
logic on the server.

## Client component — `AnalyzeTable.tsx`

State: `sortBy` (`'firstLine' | 'count' | bookId`), `dir`, `hidden:
Set<bookId>`.

- **Column 1 ("In books")**: count of *visible* songbooks containing the song
  (translated or not); sort button with `▲▼` (both arrows when inactive, single
  arrow when active — the `sortArrows` helper; the corner "First line (N)"
  button uses the `indicator` suffix variant instead).
- **Column 2 ("First line (N)")**: N = visible row count; default sort.
- **Book columns**: header = linked thumbnail (`BookThumbnail` + overlaid
  `getBookLangLabel` pill) + 2-line clamped title + actions row:
  `(translated/total) ▲▼` sort button (`bookCounts.translated` /
  `bookCounts.total`) and `×` hide button.
- **Cells**: page string as link to `/{bookId}/{slug}/`; `link` when the song
  is present but page-less; `-` (`&__cell--empty`) when absent. Translated
  cells are bold (`&__cell--translated`), untranslated regular weight.
- **Page sort** (per book) is three-tier via `rank()`: paged songs (numeric by
  leading integer of the page string, direction applies) → page-less `link`
  songs → absent songs; ties keep the incoming first-line order (stable sort).
- **Hiding**: hiding a book removes its column AND rows that exist in no
  remaining visible book; counts in column 1 shrink accordingly, per-book
  header counts (`bookCounts`) do not. If the active sort column is hidden the
  sort falls back to `firstLine`. "Show all songbooks" appears in the corner
  cell only when `hidden.size > 0`.

## Layout / SCSS — `AnalyzeTable.scss`

The page escapes the normal app chrome entirely, all driven from this file:

- `.Layout:has(.Analyze)` hides `.Header` and `.Footer` and sets
  `.Layout__content { height: 100%; overflow: hidden }`.
- `.Analyze.Main__container` drops the `--content-max-width` cap; its
  `.Main__content` is `height: 100vh; padding: 0; align-items: stretch`.
- `.AnalyzeTable` is the **single scroll container** (`flex: 1; min-height: 0;
  overflow: auto`) — both directions scroll here; only the header row is
  sticky.

**GOTCHA (sticky header borders)**: with `border-collapse: collapse` the
sticky `thead th` loses/doubles its horizontal borders while scrolling. The
header row therefore uses `border-top/bottom: none` + an inset `box-shadow`
for its 1px top/bottom lines, and the first `tbody` row drops `border-top` so
the divider isn't 2px at scroll position 0. Don't "simplify" this back to
plain borders.

**GOTCHA (height chain)**: a full flex-column height chain through
`Layout__content → Main → container` broke scrolling before; the working
approach is the explicit `100vh` on `.Main__content` with the table flexing
inside it. Also keep `min-width: 0` on `.Main__content` or the table's own
horizontal scrollbar disappears (flex min-size).

## Hotkey

`a` in `other/hooks/useGlobalHotkeys.ts` → `router.push('/{bookId}/analyze')`;
`'analyze'` is in `NON_SONG_SEGMENTS`; cheat-sheet row in `HotkeysModal.tsx`
(English fallback, `// TODO:` translation key). See
`global-hotkeys.instructions.md`.
