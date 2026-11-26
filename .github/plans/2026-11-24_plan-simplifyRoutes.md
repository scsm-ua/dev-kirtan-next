# Plan: simplify the routing system

> Status: implemented (phases 1–5).
>
> Differences from the text below:
>
> - `load` may return `meta` next to `kind` and `data` (items, so the content is not loaded twice).
> - Root pages are made with `defineRootPage` (`routes/rootPage.tsx`).
> - `generateStaticParams` of `definePage` lists only the book of the parent params.
> - The registry exports `isPrecachePage` and `getPrefetchPaths`; `useAppRouter` takes the second one as an argument.
> - Hotkeys read the page kind from `parsePath` for the authors page too.
> - The docs were updated with each phase, not in a separate one.

## Goal

The logic of one route is spread over 8–10 files (see "How a route is declared" in `app-routes.instructions.md`), which makes routes hard to add and to support. After this change a route is declared in three places, one per runtime layer, and in each place it is one self-contained entry.

No URL, HTML page, `/data/` file or visible behaviour changes.

Options considered:

1. Split by layers: one file per layer with the logic of all routes.
2. Split by routes: one class per route that implements all layers.
3. Mixed. **Chosen.**

Option 2 cannot exist as one file: the client bundle would import `fs`, and the export page would import view SCSS. Its closest form, a folder per route with three files, gives about 30 small files and the largest move. Option 1 alone puts all build logic into one file of about 300 lines.

## What exists today

The same facts are written several times:

| Fact | Where it is written |
|---|---|
| URL scheme | 5 hand-written inverse functions in `other/router/routes.ts` (`parsePath`, `getRoutePath`, `getRouteFile`, `parseItemFile`, `parseAudioFile`) plus `ITEM_ROOT_PAGES` |
| Which routes a book has | `listItemRoutes` / `listAudioRoutes` in `lib/pageData/index.ts`; `generateStaticParams` of each `page.tsx` (4 param-list functions); `app/sitemap.ts` |
| "The book has audio" | the loader, `listAudioRoutes`, `getAudioBookIdParamList`, the sitemap, `hasPage` in `getAudioPageMeta` |
| Page of a kind | 9 `page.tsx` files that differ in kind, metadata builder, param list and JSON-LD |
| Data of a kind | one `switch` in `lib/pageData/loaders.ts` |
| View and chrome of a kind | `VIEWS` and the `getChrome` switch in `components/app/views/registry.ts` |
| Other per-kind rules | precache rule in `AppRoot.tsx`, neighbour prefetch in `useAppRouter.ts`, song detection in `useGlobalHotkeys.ts` |

## The three layers

A route's code runs in three places that cannot share a module. These stay, and nothing else does.

| Layer | Runs in | Holds | File |
|---|---|---|---|
| Shared | client bundle, build, tests | URL ↔ route ↔ data file | `other/router/routes.ts` (one table) |
| Build | Node only (`fs`) | list, metadata, data, JSON-LD, sitemap | `lib/pageData/routes/<kind>.tsx` (one file per route) |
| Client | browser (React, SCSS) | view, chrome, client rules | `components/app/views/*` + `registry.ts` (one entry per kind) |

## Decisions

| Question | Decision |
|---|---|
| Classes or objects? | Plain typed objects. A route has no state, and page data must be plain JSON. Root pages share a helper function, not a base class. |
| How is the URL of a route written? | As a pattern: `'audio/:singerId'`. Parse and build are generic, so they cannot drift apart. |
| Where does `TRoute` come from? | It is derived from the URL table. `types/pageData.ts` re-exports it, so importers do not change. |
| Do `SONGBOOK_PAGE` and the builders of `other/paths.ts` stay? | Yes. They remain the link API of components (about 30 files). The table uses the `SONGBOOK_PAGE` values as segments; the existing round-trip test covers the match. |
| Do the data types stay in `types/pageData.ts`? | Yes, written by hand. They are the contract between loader and view. |
| Do the metadata builders in `other/metadata/` change? | No. Route objects call them. The `hasPage` rule inside `getAudioPageMeta` stays (one remaining copy of "has audio"). |
| Do the `page.tsx` files stay? | Yes, as stubs of about 5 lines. Next needs the files and a literal `dynamicParams`. |
| Do the two JSON handlers stay? | Yes. The split by cost is needed in dev (`app-architecture.instructions.md`, "Development"). The folder of the data file decides the handler. |
| One catch-all page instead of the stubs? | Not in this plan. See "Later". |
| `public/sw.js` | No change. It knows `/data/<book>/…` and the bundle, not single routes. |

## Changes

### 1. Shared: URL table — `other/router/routes.ts`

```ts
export const ROUTES = {
  'book-list':    { path: '', file: 'index' },
  other:          { path: SONGBOOK_PAGE.OTHER },
  contents:       { path: SONGBOOK_PAGE.CONTENTS },
  'a-z':          { path: SONGBOOK_PAGE.A_Z },
  authors:        { path: SONGBOOK_PAGE.AUTHORS },
  search:         { path: SONGBOOK_PAGE.SEARCH },
  audio:          { path: 'audio', file: 'audio/index' },
  'audio-singer': { path: 'audio/:singerId' },
  item:           { path: ':slug' }   // Last: any other single segment.
} as const;
```

- `path` is relative to `/<bookId>/`. `file` is relative to `/data/<bookId>/`, without `.json`, and defaults to `path`.
- Key order is the match priority, so a root segment shadowing a slug is visible here.
- `TRoute` = for each key, `{ kind, bookId }` plus the `:params` of its pattern (template literal types).
- Generic functions replace the switches: `parsePath`, `getRoutePath`, `getRouteFile`, `getRouteDataUrl` (same names and results as today) and `parseDataFile(bookId, file)`, which replaces `parseItemFile` and `parseAudioFile`.
- `NON_APP_ROOTS`, `NON_APP_PAGES`, `SHELL_PATH`, `DATA_ROOT`, `getBookBundleUrl` and the `/` → first book rule stay.
- `TRootPageKind` and `ITEM_ROOT_PAGES` are removed.

### 2. Build: one object per route — `lib/pageData/routes/`

```ts
type TServerRoute<K extends TRoute['kind']> = {
  /** Routes of this kind the book has; empty when it has none. The only "exists" rule. */
  list(bookId: string): Array<TRouteOf<K>>;
  /** Next metadata; the client head is cut from it. */
  meta(route: TRouteOf<K>): Promise<Partial<Metadata>>;
  /** Kind and data of the page, or `null` when the route has no page. */
  load(route: TRouteOf<K>, book: TBookDescription): Promise<TLoaded<K> | null>;
  /** JSON-LD of the static HTML. */
  jsonLd?(page: TPageDataOfRoute<K>): ReactNode;
  /** Sitemap entry; without it the page is not in the sitemap. */
  sitemap?: { freq?: 'weekly' | 'monthly'; priority: number };
};
```

Files:

- `types.ts`: the interface above.
- `bookList.tsx`, `other.tsx`, `contents.tsx`, `az.tsx`, `authors.tsx`, `search.tsx`, `audio.tsx`, `audioSinger.tsx`, `item.tsx`: one object each, moved out of the `switch` in `loaders.ts`, the `page.tsx` files and `sitemap.ts`. `getAuthorsData` moves to `authors.tsx`.
- `item.tsx`: `load` and `jsonLd` pick by `item.type` from one map `{ song: …, page: … }`, so a new content type is one entry there.
- `index.ts`: `SERVER_ROUTES`, typed `{ [K in TRoute['kind']]: TServerRoute<K> }`. A missing route is a type error.

Generic code built on `SERVER_ROUTES`:

| Function | File | Replaces |
|---|---|---|
| `loadPageData(route)` | `lib/pageData/loaders.ts` | the `switch`; `make` and `toHead` stay here |
| `listRoutes(bookId, folder?)` | `lib/pageData/index.ts` | `listItemRoutes`, `listAudioRoutes`. `folder` is `''` or `'audio'`: the folder of the data file |
| `definePage(kind)` → `{ generateMetadata, generateStaticParams, Page }` | `lib/pageData/page.tsx` | the body of every `page.tsx` |
| `defineDataHandler(folder)` → `{ generateStaticParams, GET }` | `lib/pageData/dataHandler.ts` | the body of both JSON handlers |
| sitemap entries from `listRoutes` + `sitemap` | `app/sitemap.ts` | the hand-written lists; the `hidden` books filter stays |

`loadBookBundle`, `respondWithPageData` and `getSharedAssets` keep their place.

Stub, for example `app/[bookId]/contents/page.tsx`:

```tsx
const { generateMetadata, generateStaticParams, Page } = definePage('contents');

export { generateMetadata, generateStaticParams };
export default Page;
```

- `dynamicParams = false` stays a literal in the files that have it today.
- `app/page.tsx` (root `/`) stays hand-written because of the `getRootPendingScript` head; it takes its JSON-LD from the `book-list` object.
- Removed when nothing else uses them: `getAudioBookIdParamList`, `getSingerParamList`, `getSongSlugParam`.

Order: `listRoutes` follows the table order (root pages, audio, items). That is today's sitemap order. The key order inside `bundle.json` changes (audio before items), which no reader depends on.

### 3. Client: one entry per page kind — `components/app/views/registry.ts`

```ts
type TViewEntry<K extends TPageKind> = {
  View: ComponentType<TViewProps<K>>;
  /** Layout props; default `{ bookId, pageType: kind }`. */
  chrome?(page: TPageDataOf<K>): TLayoutChromeProps;
  /** `false`: opening the page starts no book caching. Default `true`. */
  precache?: boolean;
  /** Paths to prefetch after the page is shown. */
  prefetch?(page: TPageDataOf<K>): Array<string>;
};
```

- `VIEWS` and the `getChrome` switch merge into one table of these entries. `renderView` and `getChrome` keep their signatures.
- `AppRoot.tsx` reads `precache` instead of testing `kind !== 'book-list'`.
- `useAppRouter.ts` reads `prefetch` instead of testing `song` / `page`. The router must not import the registry (views); `AppRoot` passes the function in.
- `useGlobalHotkeys.ts`: song detection uses `parsePath(pathname)?.kind === 'item'` instead of its own `NON_SONG_SEGMENTS`.

### 4. Docs

- `app-routes.instructions.md`: "eight places" becomes the three layers; recipes A–D are rewritten (see below); `applyTo` gets `lib/pageData/routes/**`.
- `app-architecture.instructions.md`: router table (`parseDataFile`), registry description, rule 7.
- `pages.instructions.md`: new content type → the map in `item.tsx`.
- `CLAUDE.md`: the row of `app-routes.instructions.md`.

## Result: adding a root page

| | Today | After |
|---|---|---|
| New files | metadata builder, view, `page.tsx` | route object, view, `page.tsx` stub |
| Edited files | `paths.ts`, `types/pageData.ts`, `routes.ts`, `loaders.ts`, `lib/pageData/index.ts`, `registry.ts`, `sitemap.ts` | `routes.ts` (1 line), `types/pageData.ts` (data type + union line), `routes/index.ts` (1 line), `registry.ts` (1 entry) |
| Files with logic | 10 | 2 (route object, view) |

A metadata builder in `other/metadata/` is still written when the page needs its own.

## Phases

Each phase is one commit that passes all checks and can ship alone.

1. **URL table** (Changes 1). Handlers switch to `parseDataFile`.
2. **Build objects** (Changes 2).
3. **Client registry** (Changes 3).
4. **Docs** (Changes 4).

## Tests

- Phase 1: `tests/logic/other/router/routes.test.ts` must pass with only the `parseItemFile` / `parseAudioFile` cases renamed. Add cases for match priority and for a pattern param.
- Phase 2:
  - `tests/data/all-routes.test.ts`, `tests/data/lib/pageData/*.test.ts`, `pnpm run test:build`.
  - Before the phase, keep a copy of `.test-output/site/`; after it, `diff -r` the two builds. Only the build id and the key order of `bundle.json` may differ.
  - New `tests/data/lib/pageData/routes/` tests only where a route object has its own logic (`item`, `audioSinger`, `authors`).
- Phase 3: `tests/ui/all-views.test.tsx`, `tests/ui/components/app/AppRoot.test.tsx`, `pnpm run test:e2e` (navigation, offline, root).
- Helpers that import the old names (`tests/helpers/dataServer.ts`, `tests/helpers/pageData.ts`) are updated in the phase that removes the name.
- Coverage thresholds in `vitest.config.mts` are not lowered.

## Phase 5 (proposed): constants for route kinds

> Status: implemented with the recommended options of "Decisions" below.

### Problem

After phases 1–3 a route kind is written as a string literal (`'book-list'`, `'authors'`, `'item'`) in about 70 places of the source and about 135 places of the tests. The rest of the project names such ids with constants: `SONGBOOK_PAGE`, `ITEM_TYPE` ("prefer these over raw string literals"), `ANALYTICS_PAGE_TYPE`. Before phase 2 the root-page kinds were written as `SONGBOOK_PAGE.CONTENTS`; the stubs and route objects of phase 2 replaced that with literals.

What the literals cost and what they do not:

| | Today |
|---|---|
| Typo in a kind | Compile error everywhere: every kind is checked against `TRoute['kind']` or `TPageKind`. Constants add no safety here |
| Consistency with the project | Broken: ids are constants elsewhere |
| Same value under two names | `ANALYTICS_PAGE_TYPE.BOOK_LIST` / `.AUDIO_SINGER` repeat two kinds, and the default chrome sends `page.kind` as the analytics page type, so kinds already are analytics values |
| Search for the uses of one kind | Text search; `'page'`, `'song'`, `'audio'`, `'other'`, `'search'` also match unrelated strings |

Where the literals are:

| Place | Example | Count (about) |
|---|---|---|
| Keys of the three tables | `ROUTES`, `SERVER_ROUTES`, `VIEWS` | 28 |
| Values | `definePage('contents')`, `defineRootPage('search', …)`, `{ kind: 'item', … }`, `kind === 'authors'` | 25 |
| Type arguments | `TViewProps<'authors'>`, `TServerRoute<'audio'>`, `TEnvelope<'a-z', …>` | 20 |
| Tests | `{ kind: 'contents', bookId }`, `loadPage(route, 'song')` | 135 |

### Proposal

1. **One constant next to the URL table** (`other/router/routes.ts`):
   ```ts
   export const ROUTE_KIND = {
     BOOK_LIST: 'book-list',
     OTHER: SONGBOOK_PAGE.OTHER,
     CONTENTS: SONGBOOK_PAGE.CONTENTS,
     A_Z: SONGBOOK_PAGE.A_Z,
     AUTHORS: SONGBOOK_PAGE.AUTHORS,
     SEARCH: SONGBOOK_PAGE.SEARCH,
     AUDIO: SONGBOOK_PAGE.AUDIO,
     AUDIO_SINGER: 'audio-singer',
     ITEM: 'item'
   } as const;
   ```
   Root-page kinds take their value from `SONGBOOK_PAGE`, which states the rule "kind = URL segment" in code. Page kinds that are not route kinds (`song`, `page`) keep using `ITEM_TYPE`.
2. **Tables use computed keys:** `[ROUTE_KIND.BOOK_LIST]: { path: '', file: 'index' }`. `TRoute` is still derived from the table; the mapped types still report a missing kind.
3. **Values use the constant:** `definePage(ROUTE_KIND.CONTENTS)`, `{ kind: ROUTE_KIND.ITEM, bookId, slug }`, `kind === ROUTE_KIND.AUTHORS`.
4. **Type arguments stay literals:** `TViewProps<'authors'>`. A constant there needs `typeof ROUTE_KIND.AUTHORS`, which is longer and no safer, because a wrong literal in a type argument does not compile.
5. **Tests stay literals.** The kind is part of the page-data JSON (`kind`) and of analytics, so a test should pin the value, not repeat the constant.
6. **`ANALYTICS_PAGE_TYPE` is removed;** `TAnalyticsPageType` is built from `TPageKind` plus the `SONGBOOK_PAGE` segments (the full-load pages `analyze` and `export` send theirs), and the chrome entries use `ROUTE_KIND` / `ITEM_TYPE`. The values sent to analytics do not change.
7. **`ldKey` is not a route id.** `'CONTENTS_PAGE'` is a group of `source/translations.json` (`<group>.SCHEMA.NAME`). Translation keys are plain strings everywhere in the project, so no constant; instead `ldKey` and `pageKey` of `LdJson` get a union type of the groups that have `SCHEMA`, which makes a typo a compile error.

No URL, data file or analytics value changes. Phase 5 is one commit; checks as in phase 3 (`pnpm test`, `test:build`, `test:e2e`).

### Decisions

| Question | Options | Chosen |
|---|---|---|
| Do it at all? | Keep literals (they are type-checked) / use constants | Constants for values, for consistency with `SONGBOOK_PAGE` and `ITEM_TYPE` |
| Type arguments | Literals / `typeof ROUTE_KIND.X` | Literals |
| Tests | Literals / constants | Literals |
| `ldKey` | String / union type / constants | Union type |

## Later (not in this plan)

> Decided 2026-11-25: not planned. The `page.tsx` stubs stay; a file per route is the usual Next.js pattern.

The idea, kept for the record:

One catch-all `app/[bookId]/[[...path]]/page.tsx` would remove the stubs, so a new route would need no file under `app/`. It needs a spike first:

- that static export writes the same files;
- the cost in dev, where `generateStaticParams` runs on every request and would include the audio scan;
- Next issue #53717 (`bookId` params in `app/layout.tsx`).
