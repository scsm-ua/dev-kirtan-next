---
description: "Use when modifying the songbook HTML export feature: the /[bookId]/export page, the buildExportHtml document builder in lib/export.ts, any export option in TExportOptions (only translated / word by word / translation / TOC / first-line index / page numbers / verse indent / verse number mode / enable links / nav links), the ExportToolbar download/copy/print buttons, or the export document structure (heading levels, section wrappers, verse/wbw/translation paragraph classes)."
applyTo: ["lib/export.ts", "other/exportDoc.ts", "app/[bookId]/export/**", "components/export/**"]
---

# Songbook HTML Export

`/{bookId}/export` renders the entire songbook as one minimal HTML document meant to be **opened in a word processor** (Word / LibreOffice / Pages / Google Docs) for styling and printing. Everything is prebuilt at build time (`output: 'export'` — no runtime server).

## Architecture

```
lib/export.ts  buildExportHtml(bookId) ──► { body, lang, title }   (server, build time)
                                              │
app/[bookId]/export/page.tsx (static, noindex)
app/[bookId]/export/layout.tsx (bare <html><body>, since the page skips the site Layout;
                                sets `robots: noindex` only — no title, so ExportView owns document.title)
                                              ▼
components/export/ExportView.tsx (client)  holds a single `options: TExportOptions` state,
                                           reads/writes it to URL query params,
                                           sets document.title = makeExportFileName(fileName) on mount
     │  filterExportBody(body, options)  ──► preview innerHTML
     └► ExportToolbar {options, onChange(patch), getHtml, fileName}
                       getHtml() = wrapExportDoc(filterExportBody(body, options))
                       └─► Download .html / Copy HTML / Print (Save PDF)

other/exportDoc.ts — pure, node-free:
  TExportOptions, DEFAULT_EXPORT_OPTIONS, TVerseNumberMode,
  exportOptionsFromSearch / exportOptionsToSearch,
  DOC_STYLE, escHtml, wrapExportDoc, filterExportBody,
  makeExportFileName(baseName, ext?)  — shared `${baseName}-YYYY-MM-DD-HH-MM${ext}`
```

- **Single source of truth**: the body string built in `lib/export.ts`. Preview and downloaded/copied file are both `filterExportBody(body, opts)` — never derive them separately.
- Only the body is shipped to the client; the standalone document shell is added by `wrapExportDoc` at download/copy time.
- The page intentionally does **not** use `components/common/Layout`. A dedicated `app/[bookId]/export/layout.tsx` provides the bare `<html><body>` wrapper.
- Data loading reuses `getContentsByBookId`, `getSongBySlug`, `getIndexesByBookId`; never duplicate song parsing here.
- `other/exportDoc.ts` is imported by a client component — keep it free of `fs`/`path` imports.

## Export Options

Defined in `TExportOptions` (`other/exportDoc.ts`). Defaults live in `DEFAULT_EXPORT_OPTIONS`.

| Option | Default | Effect |
|---|---|---|
| `onlyTranslated` | `true` | Removes `.song`, `.first-line`, `.toc-item` without `data-translated="1"` |
| `withWbw` | `true` | When off, removes every `p.wbw` |
| `withTranslation` | `true` | When off, removes every `p.translation` (also silently no-ops the `translation-prefix` verse-number mode since there's nothing to prepend to) |
| `withToc` | `true` | When off, removes `section.toc` and strips nav-link anchors pointing to `#toc` |
| `withFirstLines` | `true` | When off, removes `section.first-lines` and strips nav-link anchors pointing to `#first-lines` |
| `withPageNumbers` | `false` | When off, removes every `span.page-num` |
| `withNavLinks` | `true` | When off, removes every `.nav-links` container |
| `withLinks` | `true` | When off, removes every `.nav-links` container **and** replaces every remaining `<a>` with a plain `<span>` (text only). The toolbar disables the "Add navigation to top" checkbox while `withLinks` is off. |
| `verseIndent` | `40` | Applied inline as `margin-left: {n}px` to every `p.verse`. Toolbar exposes a range + number input, capped at 0 min. |
| `verseNumberMode` | `'verse-suffix'` | `'heading'` keeps `h5`; `'verse-suffix'` appends `  [N]` to the verse text; `'translation-prefix'` prepends `<strong>N  </strong>` to the translation |

All options are applied by `filterExportBody` (browser-only — it uses `DOMParser`). Categories left without songs are dropped; TOC group headings (`h2.toc-item-group`) and first-line group headings (`h2.first-line-group`) left without following items are dropped; empty `.nav-links` (all anchors stripped) are dropped.

**URL persistence**: `ExportView` mirrors state to `?translated=&wbw=&toc=&index=&pages=&nav=&links=&trans=&indent=&nums=` via `history.replaceState`. Only values that **differ from the default** are serialized, so the URL stays clean. On mount, `exportOptionsFromSearch` restores state before the write-back effect fires (gated by a `hydrated` flag) so a shared/refreshed link is preserved.

**Adding a new option**: bool options go in the `BOOL_PARAMS` table in `other/exportDoc.ts` — that single table drives both serialization and deserialization symmetrically (absent param → default). Non-bool options need their own branch in `exportOptionsToSearch` / `exportOptionsFromSearch` (see `verseIndent`, `verseNumberMode`). Then add a filter branch in `filterExportBody` and one `<label>` in `ExportToolbar`. Any new option must be expressible as a **DOM query over the prebuilt markup**; if it can't be, add a marker attribute in `lib/export.ts` rather than rebuilding the body on the client.

**Options state shape**: `ExportView` keeps a single `useState<TExportOptions>` and a `patchOptions(patch: Partial<TExportOptions>)` helper. `ExportToolbar` receives `{ options, onChange }` — do **not** re-introduce per-field props or per-field setters.

## Document Structure (fixed contract)

Top-to-bottom order in `body`:

```
h1.book-title                              ← songbook title
p.nav-links                                ← "↓" link to first-lines (before TOC)
section.toc#toc                            ← Table of Contents
  h1                                       ← translate(bookId, 'FOOTER.CONTENTS')
  h2.toc-item-group                        ← group name (only when showGroupNames)
  p.toc-item[data-translated]              ← one link per song, "title — N" (page in span.page-num)
section.category                           ← one per contents group
  h1                                       ← group.name  (page-break-before: always in DOC_STYLE)
  section.song#song-{slug}[data-translated]
    div.verse-block[data-number]           ← first verse-block also carries the song header:
      h2                                   ← song title (lines joined with space)
      span.nav-links                       ← inline "↑ TOC" / "↓ first-lines" next to the h2
      h3                                   ← subtitle (one per line)
      h4                                   ← author
      p.wbw                                ← song-level word_by_word
      h5                                   ← verse number (only if >1 verse)
      p.verse-subtitle
      p.verse
      p.wbw
      p.translation
    div.verse-block[data-number]           ← subsequent verses (header-less)
      …
section.first-lines#first-lines            ← A–Z first-line index
  h1                                       ← translate(bookId, 'FOOTER.INDEX')
  h2.first-line-group                      ← letter group heading (only when showGroupNames)
  p.first-line[data-translated]            ← one link per entry, "title — N"
```

Inline markers (used by `filterExportBody`):

- `span.page-num` wraps the ` — N` suffix on `.toc-item` and `.first-line` entries.
- `.nav-links` wraps the top-nav containers. Two forms exist: `p.nav-links` (block, e.g. the ↓ link above the TOC) and `span.nav-links` (inline, appended to the song `h2`). Anchors inside are `href="#toc"` (up) and `href="#first-lines"` (down). `filterExportBody` targets **all** `.nav-links` regardless of element name.

Song headers (`h2` + inline `span.nav-links` + `h3`s + `h4` + song-level `p.wbw`) are injected as a `headerPrefix` at the **top of the first `renderVerse` call** so the whole title block stays inside the same `.verse-block` — combined with `div.verse-block { page-break-inside: avoid }` in `DOC_STYLE`, this keeps a song title from being orphaned at the bottom of a PDF page.

Changing heading levels, class names, `data-*` attributes, or section ids breaks documents users have already styled **and** breaks `filterExportBody` — treat this mapping as a contract.

### Unified index renderer

Both the TOC and the first-lines section go through `renderIndex(opts)` in `lib/export.ts` (parameterized by `className`, `getTitle`, `showGroupNames`, `headingKey`). Keep them unified — divergence has to be expressed as new params, not two functions.

- `item.has.translation` (from the transformed contents / a-z JSON) drives `data-translated` on both `.toc-item` and `.first-line`. Do **not** re-derive by loading each song — the JSON already carries it.
- In the a-z file, `title` and `aliasName` are swapped compared to the contents file (see `scripts/createAZ.js`). First-line entries fall back `item.title || item.aliasName` accordingly.

## Word-Processor Semantics (why the markup looks this way)

- Word/LibreOffice map `h1`–`h6` to *Heading 1–6* paragraph styles on import.
- Word/LibreOffice convert CSS classes from the `<style>` block into **named paragraph styles** (`verse`, `wbw`, `translation`, `toc-item`, `first-line`, `book-title`, `nav-links`, `toc-item-group`). Keep exactly one class per semantic block and keep `DOC_STYLE` minimal — it exists to seed those styles, not to look good. Inline element classes (e.g. `span.page-num`) are **not** promoted to character styles by LibreOffice; they still work for filtering and can be styled with CSS, but don't rely on them showing up in the Styles pane.
- Multi-line blocks join lines with `<br>` inside a **single `<p>`** so each block stays one restylable paragraph. Do not emit one `<p>` per line.
- Preserve verse alignment via `escVerseSpaces`: leading indent and runs of 2+ spaces become `&nbsp;` chains. Do **not** use `white-space: pre-wrap` — Word ignores it.
- The doc must keep `<meta charset="utf-8">` — diacritics break in Word without it.

## Content Rules

- Plain-text lines (titles, verse text, first lines) go through `escHtml()`. Translation/wbw lines go through `processTranslationLines()` (`other/utils.ts`), which returns HTML — insert unescaped, never double-escape.
- Verse text bold/non-bold mirrors `getLineContent` in `components/song/Verse/helpers.tsx`: `meta['inline verse'] === 'non bold'` → plain; `meta['verse parentheses'] === 'non bold'` → split on `(...)` groups, paren content plain, non-paren wrapped in `<strong>`; otherwise the whole line is `<strong>`.
- Songs with page duplicates appear multiple times in contents; emit each slug **once** (the `seen` set), at first occurrence. The TOC does **not** dedupe — it mirrors the contents page.
- Inline/learn wbw tables are deliberately excluded — classical `word_by_word` only.
- `esc(String(item.page))` — `item.page` is a **number** in the source JSON (despite the `page: string` type declaration in `TContentItem`).

## Toolbar (components/export/ExportToolbar.tsx)

- Client component. Props are exactly `{ fileName, getHtml, options, onChange }`. `onChange({...})` receives a `Partial<TExportOptions>` patch — keep it that way; do not add per-field handlers.
- Grouped into **Navigation** (toc / first-lines / page numbers / links / nav links) and **Songs** (verse indent / verse number mode / wbw / hide-untranslated). Local `collapsed` state hides the groups behind a ⚙/✕ button.
- Download uses a Blob + `a[download]`; filename comes from `makeExportFileName(fileName, '.html')` (`${fileName}-YYYY-MM-DD-HH-MM.html`), generated at click time. Reuse `makeExportFileName` — do not inline the timestamp.
- Copy writes a `ClipboardItem` with **`text/html`** flavor (this is what makes Word/Docs paste with heading styles) plus `text/plain`, with `writeText` fallback.
- Print button just calls `window.print()`. `document.title` (set by `ExportView` on mount to `makeExportFileName(fileName)`) becomes the suggested PDF filename.
- The document is produced by the `getHtml()` prop at click time, so it always reflects the current option state.
- The toolbar is `position: fixed` and hidden via `@media print` — keep it out of any print/PDF path.

## Preview Effect (ExportView.tsx)

The effect that writes `previewRef.current.innerHTML = getBody()` runs on **every render** (no dependency array). This is intentional — it lets HMR of `other/exportDoc.ts` (filter logic) update the preview without a page reload, and it removes the need for `dangerouslySetInnerHTML` on the container. Setting innerHTML doesn't trigger a re-render, so this is not an infinite loop.

## PDF Filename (document.title)

`ExportView` sets `document.title = makeExportFileName(fileName)` in a mount-only effect. The export layout intentionally does **not** set a `<title>` via `generateMetadata` — doing so would let Next.js overwrite `document.title` during hydration and the PDF save dialog would show `Songbook-Export-{bookId}` without the timestamp. Keep the layout's metadata to `robots: 'noindex'` only.

## Discoverability

Hidden from the UI on purpose. Reachable by URL and the `e` hotkey (`useGlobalHotkeys` → `router.push('/{bookId}/export')`; listed in `HotkeysModal`). `export` is in `NON_SONG_SEGMENTS` in `useGlobalHotkeys.ts` — keep it there or the page gets treated as a song page. Page metadata is `noindex`; the route is not in `app/sitemap.ts`.

## Verification

- `pnpm build` → `out/{bookId}/export/index.html` exists per book.
- Open the downloaded file in Word/LibreOffice: Heading 1–6 map correctly and the section classes appear in the Styles pane.
- URL round-trip: toggle an option, refresh — state should restore. All-defaults → URL has no `?`.
