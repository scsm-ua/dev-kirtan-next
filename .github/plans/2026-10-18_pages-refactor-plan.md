## Architectural decision: Strategy/registry over class hierarchies

Classic OOP inheritance (`class Song extends ContentItem`) is a poor fit here: your data comes from JSON and crosses Next.js server/client serialization boundaries, where class instances don't survive. The smooth alternative that still gives you real polymorphism is a **content-type handler registry** (strategy pattern) — plain objects implementing a shared interface, with the discriminator you already derive at import time (`transformContents.js` → `item.type`) as the only dispatch key.

```ts
// lib/content/handler.ts — the single contract
export interface ContentHandler<TData> {
  type: TItemType;
  load(slug: string, bookId: string): Promise<TData | null>;
  getMeta(data: TData, ctx: TMetaCtx): Metadata;
  renderExport(data: TData, slug: string): string;   // pure string, no react-dom/server
  Body: (props: { data: TData; bookId: string }) => ReactNode; // server component
}

// lib/content/registry.ts
export const CONTENT_HANDLERS = {
  [ITEM_TYPE.SONG]: songHandler,
  [ITEM_TYPE.PAGE]: pageHandler,
} satisfies Record<TItemType, ContentHandler<any>>;
```

Key properties:

- **Song and Page become siblings**: each lives in its own module implementing the same interface; neither knows about the other.
- **All four `if (type === PAGE)` branches collapse** (route, metadata, export ×2) into one lookup: `CONTENT_HANDLERS[item.type]`.
- **`TSong` and `TPage` stay distinct** — no forced common base shape. Shared fields already live in `TContentItem`; the polymorphism lives in behavior, not data.
- Adding a third type later (e.g. `image`, `index`) = one new folder + one registry entry.

## Target structure

```
lib/content/
  handler.ts        contract + TMetaCtx
  registry.ts       CONTENT_HANDLERS map + getHandler(item)
  song/
    index.ts        songHandler
    load.ts         ← moved from lib/song.ts (getSongBySlug + derivations)
    meta.ts         ← getSongMeta extracted from getSongPageMeta.ts
    export.ts       ← renderSong + verse helpers from lib/export.ts
  page/
    index.ts        pageHandler
    load.ts         ← lib/page.ts
    meta.ts         ← getPageMeta branch
    export.ts       ← renderPage from lib/export.ts
components/content/
  ContentShell.tsx  shared chrome: Layout, book header, PageNumber, PrevNextNav
  song/  → SongText, SongHeader, Verse… (moved or re-exported from components/song)
  page/  → PageView
```

Shared, type-agnostic things stay where they are: `getContentItemBySlug`, `getNavItems`, `renderMarkdownBody`, sitemap, search.

## Phases

**Phase 1 — Contracts & registry (no behavior change)** ✅
Create `lib/content/handler.ts` + `registry.ts`. Wrap existing `getSongBySlug`/`getPageBySlug` into `songHandler`/`pageHandler` without moving code yet. Build must stay green.

**Phase 2 — Route unification** ✅
In `page.tsx`: extract the duplicated chrome (Layout, `.SongPage__header` block, PageNumber, PrevNextNav) into `ContentShell`; the route becomes `getContentItemBySlug → handler.load → <ContentShell>{<handler.Body/>}</ContentShell>`. Song-only extras (book descriptions, Telegraph URL, audio, `LdJsonSong`) move inside `songHandler.Body` so Page stops paying for Song's needs.

**Phase 3 — Metadata** ✅
Split `getSongPageMeta.ts` into `song/meta.ts` + `page/meta.ts`; the route's `generateMetadata` becomes a thin dispatcher `getContentMeta` using the registry. Shared helpers (`getCommonMeta`, `getOG`, `getTwitter`) stay in `metadata`.

**Phase 4 — Export** ✅ *(correction: `Body` moved out of lib handlers into `components/content/registry.tsx` — importing components from `lib/export.ts` leaked their SCSS into the bare export page)*
In `export.ts`, replace both `item.type === ITEM_TYPE.PAGE` branches with `handler.renderExport`. **Keep emitted class names exactly as-is** (`.song`, `.song.page`, `page` on index entries) — `filterExportBody` and the `withPages` option depend on them.

**Phase 5 — Renames (cosmetic, last)** ✅
`.SongPage` → `.ContentPage` (tsx + scss), `getSongPageMeta` → `getContentMeta`, `SongPage` component → `ContentPage`. Pure rename, isolated commit so it's easy to review/revert.

**Phase 6 — Verify & docs** ✅
`pnpm build`, test export page with `withPages` on/off, prev/next nav across a song↔page boundary, metadata on both types. Update `pages.instructions.md` and repo memory.
*Verified: export body byte-identical to pre-refactor baseline (so all `filterExportBody` options, incl. `withPages`, behave identically); nav map of `002-copyright` carries prev `001-title` / next `003-programme`; titles + canonicals correct on both types.*

## What deliberately doesn't change

- The import-stage discriminator (`transformContents.js` `getItemType`) — already the clean single source of truth.
- `TContentItem`, nav, search, sitemap, A–Z — already type-agnostic.
- `renderMarkdownBody` as the sole markdown renderer (and the no-`react-dom/server` constraint).

Want me to start with Phase 1–2, or implement the whole plan?
