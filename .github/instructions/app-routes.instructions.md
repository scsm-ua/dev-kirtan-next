---
description: "Use when adding, renaming or removing a page/URL/route, or when asking which file declares a route: the registry of every app route (HTML page.tsx, /data/ JSON handler, TRoute/TPageData kind, loader, view, chrome, metadata, JSON-LD, static params; the root page) and of the full-load routes (analyze, export, shell, test, 404, sitemap, robots, manifest, legacy .html). Has step-by-step recipes for a new root page, a parametrized page, a new content item type, and a full-load page."
applyTo: ["app/**/page.tsx", "app/**/route.ts", "other/router/routes.ts", "components/app/views/**", "lib/pageData/**", "types/pageData.ts"]
---

# Routes registry and how to add a route

Concepts (one loader, HTML + JSON, client router, offline) are in `app-architecture.instructions.md`. URL builders and the trailing-slash rule are in `paths.instructions.md`.

## How a route is declared

A route's code runs in three places that cannot share a module, so an app page is declared in **three layers**. In each layer it is one self-contained entry, and TypeScript enforces the links between them.

| Layer | Runs in | File | What you declare |
|---|---|---|---|
| Shared | client bundle, build, tests | `other/router/routes.ts` | One entry in the `ROUTES` table: page path pattern and data file. `TRoute` (what to load) and the generic `parsePath`, `getRoutePath`, `getRouteFile`, `parseDataFile` are derived from it |
| Build | Node only (`fs`) | `lib/pageData/routes/<kind>.tsx`, registered in `routes/index.ts` (`SERVER_ROUTES`) | One route object (`TServerRoute`): `list` (which pages the book has), `meta`, `load` (kind + data), `jsonLd`, `sitemap` |
| Client | browser (React, SCSS) | `components/app/views/*` + `registry.ts` | View component and one `VIEWS` entry (`TViewEntry`): `View`, `chrome` (main class, footer page, analytics), `precache`, `prefetch` |

Around them:

- `other/paths.ts`: URL segment (`SONGBOOK_PAGE.*`) and the path builder components link with.
- `types/pageData.ts`: `TPageData` kind with its data type, the contract between `load` and the view.
- `app/[bookId]/**/page.tsx`: a stub of `definePage(kind)`. Next needs the file and a literal `dynamicParams`.

**Kind names.** `ROUTE_KIND` in `other/router/routes.ts` names every route kind (`ROUTE_KIND.BOOK_LIST`, `ROUTE_KIND.ITEM`, …); the kind of a root page takes its value from `SONGBOOK_PAGE`. Page kinds that are no route kinds (`song`, `page`) are in `ITEM_TYPE`. Use these constants wherever a kind is a value: table keys, `definePage(…)`, `{ kind: … }`, comparisons. Keep string literals in type arguments (`TViewProps<'authors'>`, `TEnvelope<'a-z', …>`) and in tests, which pin the value that goes into the page-data JSON and analytics.

The `ROUTES` table, by route kind:

- `path` is the page path relative to `/<bookId>/`; `:name` is a route param (`'audio/:singerId'` → `route.singerId`).
- `file` is the data file relative to `/data/<bookId>/`, without `.json`. It defaults to `path`.
- Key order is the match priority, so `item` (`:slug`) is last. It is also the order of `listRoutes` and of the sitemap.

Generic code built on `SERVER_ROUTES` (nothing here knows a single route):

| Function | File | Does |
|---|---|---|
| `loadPageData(route)` | `lib/pageData/loaders.ts` | `load` + `meta` of the route object → `TPageData` (`build`, `head`, `route` added) |
| `listRoutes(bookId, folder?)` | `lib/pageData/index.ts` | `list` of every kind, in table order. `folder` (`''` or `'audio'`) keeps only the kinds whose data file is in that folder of `/data/<bookId>/` |
| `definePage(kind)` | `lib/pageData/page.tsx` | `generateMetadata`, `generateStaticParams` and the `Page` component of a `page.tsx` |
| `defineDataHandler(folder)` | `lib/pageData/dataHandler.ts` | `generateStaticParams` and `GET` of a JSON handler |
| sitemap | `app/sitemap.ts` | every listed route whose object has `sitemap`; hidden books are skipped |

Plus, when relevant: translations, hotkeys, and links in Header / Footer / index pages.

Naming convention: for root pages, **kind = URL segment = data file name** (`contents` → `/en/contents/` → `/data/en/contents.json`).

## App routes (rendered by `AppRoot`, navigated client-side)

In the table, `en` stands for any `bookId`, and every page file is under `app/[bookId]/`. Metadata, static params, data, JSON-LD and the sitemap entry of a route all come from its route object.

| URL | Page file (stub) | Data file | `TRoute` → `TPageData.kind` | View | Route object (`lib/pageData/routes/`) | JSON-LD |
|---|---|---|---|---|---|---|
| `/` | `app/page.tsx` (not under `[bookId]`) | `/data/<firstBook>/index.json` | `book-list` of the first book | `BookListView` | `bookList.tsx` | `LdJson` (`BOOK_LIST_PAGE`) |
| `/en/` | `page.tsx` | `/data/en/index.json` | `book-list` | `BookListView` | `bookList.tsx` | `LdJson` (`BOOK_LIST_PAGE`) |
| `/en/other/` | `other/page.tsx` | `/data/en/other.json` | `other` | `OtherBooksView` | `other.tsx` | — |
| `/en/contents/` | `contents/page.tsx` | `/data/en/contents.json` | `contents` | `ContentsView` | `contents.tsx` | `LdJson` (`CONTENTS_PAGE`) |
| `/en/a-z/` | `a-z/page.tsx` | `/data/en/a-z.json` | `a-z` | `AZView` | `az.tsx` | `LdJson` (`A_Z_PAGE`) |
| `/en/authors/` | `authors/page.tsx` | `/data/en/authors.json` | `authors` | `AuthorsView` | `authors.tsx` | `LdJson` (`AUTHORS_PAGE`) |
| `/en/search/` | `search/page.tsx` | `/data/en/search.json` | `search` | `SearchView` | `search.tsx` | — |
| `/en/audio/` | `audio/page.tsx` | `/data/en/audio/index.json` | `audio` | `AudioView` | `audio.tsx` | `LdJsonAudio` |
| `/en/audio/<singerId>/` | `audio/[singerId]/page.tsx` | `/data/en/audio/<singerId>.json` | `audio-singer` | `AudioView` | `audioSinger.tsx` | `LdJsonAudio` |
| `/en/<slug>/` (song) | `[slug]/page.tsx` | `/data/en/<slug>.json` | `item` → `song` | `SongBody` | `item.tsx` | `LdJsonSong` |
| `/en/<slug>/` (markdown page) | `[slug]/page.tsx` | `/data/en/<slug>.json` | `item` → `page` | `PageBody` | `item.tsx` | `LdJsonPage` |

Where things live for these routes:

- **Which pages exist:** only `list` of the route object decides (for example a book without audio has no audio pages). Static params, JSON files, the bundle and the sitemap all follow from it.
- **Metadata builders:** `other/metadata/`; route objects call them.
- **Root page `/`:** the same page as `/<firstBook>/` (first key of the songbooks, `getFirstBookId` / `__BOOK_IDS__[0]`); `parsePath('/')` gives that `book-list` route and `getRoutePath` gives `/<firstBook>/`, which is also its canonical. On start the router replaces it with the reader's songbook. See "Root page" in `app-architecture.instructions.md`.
- **Views:** `components/app/views/` (`SongBody` and `PageBody` are in `components/content/`).
- **`bookId` static params:** the root `app/layout.tsx` (Next issue #53717).
- **`dynamicParams = false`:** a literal in the stubs of `/en/`, `other`, `audio`, `audio/[singerId]` and `[slug]`.
- **Root page `app/page.tsx`:** hand-written because of its head script; it takes metadata and JSON-LD from the `book-list` route object.

JSON handlers:

| Handler | Emits | Declared as |
|---|---|---|
| `app/data/[bookId]/[file]/route.ts` | book root, other, contents, a-z, authors, search, every song/page | `defineDataHandler('')`: lists with `listRoutes(bookId, '')`, which needs only `contents.json`, so it is cheap |
| `app/data/[bookId]/audio/[file]/route.ts` | audio index and singers (only for books with audio) | `defineDataHandler('audio')`: lists with `listRoutes(bookId, 'audio')`, which scans song files |
| `app/data/[bookId]/bundle.json/route.ts` | `/data/en/bundle.json`, all of the above for one book | `loadBookBundle` → `listRoutes(bookId)` |

The folder of a route's data file (`file` in `ROUTES`) decides its handler. Both handlers parse the file with `parseDataFile`.

All three handlers set `dynamic = 'force-static'` and `dynamicParams = false`, and declare `generateStaticParams`.

## Full-load routes (plain documents, not part of the app)

`parsePath` returns `null` for these, so links to them load a new document. Exclusions live in `routes.ts`: `NON_APP_ROOTS` (`_next`, `404`, `data`, `images`, `shell`, `test`) and `NON_APP_PAGES` (`analyze`, `export`). Any path containing a `.` is also excluded.

| URL | File | Notes |
|---|---|---|
| `/en/analyze/` | `app/[bookId]/analyze/page.tsx` | Old `Layout`, noindex. See `analyze-songbooks.instructions.md` |
| `/en/export/` | `app/[bookId]/export/page.tsx` + `layout.tsx` | Bare document, noindex. See `songbook-export.instructions.md` |
| `/shell/` | `app/shell/page.tsx` | `AppDocument page={null}`, noindex; offline fallback for the service worker |
| `/shell/assets.json` | `app/shell/assets.json/route.ts` | `getSharedAssets()`: logos and covers the service worker caches on install |
| `/test/`, `/test/player/` | `app/test/**` | Playgrounds |
| 404 | `app/global-not-found.tsx` → `NotFound` | Static `404.html`; also redirects old `.html` URLs on the client |
| `/en/<slug>.html` | `scripts/postbuild.js` | Meta-refresh redirects to the new URLs |
| `/sitemap.xml`, `/robots.txt`, `/manifest.json` | `app/sitemap.ts`, `app/robots.ts`, `app/manifest.json/route.ts` | `robots` disallows `/data/` and `/shell/` |
| `/sw.js`, `/images/**` | `public/` | Service worker and static files |

---

## Recipe A — new root page (`/en/<segment>/`)

Example: a `favorites` page with data `{ book, items }`.

1. **Path** (`other/paths.ts`): add `FAVORITES: 'favorites'` to `SONGBOOK_PAGE`. Hotkey song detection reads the URL table (`parsePath`), so step 3 covers it.
2. **Types** (`types/pageData.ts`):
   - Add `export type TFavoritesData = { … }`. Use plain JSON only: no functions, Maps or Dates.
   - Add `| TEnvelope<'favorites', TFavoritesData>` to `TPageData`.
3. **URL table** (`other/router/routes.ts`): add `FAVORITES: SONGBOOK_PAGE.FAVORITES` to `ROUTE_KIND` and `[ROUTE_KIND.FAVORITES]: { path: SONGBOOK_PAGE.FAVORITES }` to `ROUTES`, before `item`. The `TRoute` variant, `parsePath`, `parseDataFile`, `getRouteFile` and `getRoutePath` follow from it.
   - ⚠ A root segment shadows a song slug with the same name. `about` is taken too: it is the reserved slug of the About page item (`ABOUT_PAGE_SLUG`).
4. **Metadata** (`other/metadata/getFavoritesPageMeta.ts`): `({ params }) => Promise<Metadata>`, like `getContentsPageMeta`. Pass `page: SONGBOOK_PAGE.FAVORITES` to `getPageMeta` so canonical/hreflang are right.
5. **Route object** (`lib/pageData/routes/favorites.tsx`), then one line in `SERVER_ROUTES` (`routes/index.ts`; TypeScript errors until you add it):
   ```ts
   export const favoritesRoute = defineRootPage(ROUTE_KIND.FAVORITES, {
     data: (bookId, book) => ({ book, items: getFavorites(bookId) }),
     ldKey: 'FAVORITES_PAGE',           // JSON-LD from `<key>.SCHEMA.*` (add the group to `TLdJsonPageKey`); omit for none
     meta: getFavoritesPageMeta,
     sitemap: { priority: 0.8 }         // omit to keep the page out of the sitemap
   });
   ```
   - Do **all** server work in `data`, e.g. markdown → HTML or file reads.
   - `defineRootPage` is for a page every book has. If only some books have it, write the object by hand like `audio.tsx`: `list` returns `[]` and `load` returns `null` for the others.
   - The JSON file, the bundle entry, static params and the sitemap entry follow automatically.
6. **View** (`components/app/views/FavoritesView.tsx`):
   ```tsx
   export default function FavoritesView({ page }: TViewProps<'favorites'>) { … }
   ```
   - Must be client-safe: no `lib/*` data calls and no `other/metadata/*`.
   - Import its SCSS here.
   - Register it in `VIEWS` in `registry.ts` as `[ROUTE_KIND.FAVORITES]: { View: FavoritesView }`; TypeScript errors until you do.
   - Add `chrome` to the entry only if the default (`{ bookId, pageType: kind }`) isn't enough.
   - `precache: false` when opening the page must not start caching the book; `prefetch` to name the paths of the likeliest next pages.
7. **HTML route** (`app/[bookId]/favorites/page.tsx`), the whole file:
   ```tsx
   import { definePage } from '@/lib/pageData/page';
   import { ROUTE_KIND } from '@/other/router/routes';

   const { generateMetadata, generateStaticParams, Page } = definePage(ROUTE_KIND.FAVORITES);

   export { generateMetadata, generateStaticParams };
   export default Page;
   ```
8. **Extras:**
   - links built with `getSongbookPagePath(bookId, SONGBOOK_PAGE.FAVORITES)`;
   - strings in `source/translations.json` + schema (`translations-schema.instructions.md`);
   - a hotkey (`global-hotkeys.instructions.md`).
9. **Verify:** see the checklist at the end.

**Expensive data** (scans every song file, like audio): keep its data file out of the book folder, because in dev that would slow every data request. Give the `ROUTES` entry `file: '<segment>/index'` and create `app/data/[bookId]/<segment>/[file]/route.ts` with `defineDataHandler('<segment>')`. The audio handler is the template. The bundle includes it automatically.

## Recipe B — page with a parameter (`/en/<segment>/<id>/`)

Template: `audio-singer`.

1. **`types/pageData.ts`:** a `TEnvelope<'x-item', TXItemData>`.
2. **`routes.ts`:** add `X_INDEX` and `X_ITEM: 'x-item'` to `ROUTE_KIND`, then to `ROUTES`, before `item`:
   ```ts
   [ROUTE_KIND.X_INDEX]: { path: SEGMENT, file: `${SEGMENT}/index` },
   [ROUTE_KIND.X_ITEM]: { path: `${SEGMENT}/:xId` }
   ```
   `TRoute` gets `{ kind: 'x-item'; bookId: string; xId: string }`. Put the index entry first: its file `index` would also fit `:xId`. Add a link builder to `other/paths.ts` for components.
3. **Route objects** (`lib/pageData/routes/`, template `audioSinger.tsx`): `list` returns a route per id; `load` looks up the id and returns `null` when it is unknown. HTML then gets `notFound()` and JSON gets a 404, so the client falls back to the static 404.
4. **Handler** `app/data/[bookId]/<segment>/[file]/route.ts`: `defineDataHandler('<segment>')`, with the `dynamic` and `dynamicParams` literals of the audio handler.
5. **Page** `app/[bookId]/<segment>/[xId]/page.tsx`: the `definePage(ROUTE_KIND.X_ITEM)` stub plus `export const dynamicParams = false`.
6. **View and registry** as in Recipe A. Give the `VIEWS` entry a `chrome` with `itemId: page.route.xId` so analytics tracks each item separately.

## Recipe C — new content item type (shares `/en/<slug>/`)

Songs and markdown pages share route kind `item`; the real type is resolved in `lib/pageData/routes/item.tsx` from the contents item.

1. Content handler, type discriminator and source data: follow `pages.instructions.md` (`lib/content/<type>/`, `ITEM_TYPE`, `transformContents.js`).
2. `types/pageData.ts`: `| TEnvelope<'<type>', T<Type>Data, 'item'>`. The third argument ties it to the `item` route.
3. `lib/pageData/routes/item.tsx`: add one entry to the `ITEM_TYPES` map (TypeScript errors until you do). Its `load` goes through the handler and puts pre-rendered values into `data` (e.g. `bodyHtml`, not raw markdown); its `jsonLd` renders the JSON-LD of the type.
4. View (`components/content/<Type>Body.tsx` inside `ContentShell`) → one `VIEWS` entry with `chrome` (`className: 'ContentPage'`, `itemId`, `page`, `pageType`) and `prefetch` (the neighbours from `data.nav`, as `song` and `page` do).
5. Nothing else changes: listing, handler, page stub, `parsePath` and sitemap are slug-based.

## Recipe D — page that must stay a full document load

Admin, tool or one-off pages that don't use `AppDocument`:

1. Create `app/[bookId]/<segment>/page.tsx` using `Layout` (the old chrome: header, footer, hotkeys), or a dedicated `layout.tsx` for a bare document.
2. Add the segment to `SONGBOOK_PAGE` **and** to `NON_APP_PAGES` in `routes.ts`. Otherwise the router intercepts links, requests `/data/en/<segment>.json`, gets a 404 and only then reloads.
3. For a new top-level folder (`app/<name>/`), add `<name>` to `NON_APP_ROOTS`, unless its paths contain a `.`.
4. Use `noindex` and leave it out of the sitemap if it is internal. In hotkeys, `navigate()` still works: it does a full load for non-app paths.

## Removing or renaming a route

Undo the same three layers (and the path, type and page stub around them). Search for the `ROUTE_KIND` constant (its literal in type arguments and tests) and the `SONGBOOK_PAGE` constant. For a renamed public URL, consider a redirect page (`scripts/postbuild.js` pattern), because old links and the sitemap are indexed.

## Gotchas

- **Unlisted params in dev:** the dev server returns **500** (not 404) for a param missing from `generateStaticParams`. After adding data, restart `pnpm dev` if the list is cached.
- **Handler folder names:** Next ignores app folders starting with `_`, so never name one `_something`.
- **Data file names:** they must end in `.json`, and the param value is the file name.
- **Leftover hooks in views:** `useSearchParams`/`usePathname` in a view work only on the initial page. Use `useAppLocation`, `usePageQuery`, or the route from page data.
- **Server-only imports:** importing `lib/*` data functions into a view either fails the build or ships the data code to the browser. Keep them in loaders.
- **Head fields:** only `title`, `description` and `canonical` are updated client-side. OG and hreflang tags exist only in static HTML, which is fine for crawlers. Add a field to `THead` + `applyHead` only if users need it.

## Verification checklist

```sh
pnpm run type-check && pnpm run lint
pnpm run build:local   # route table lists the new page and /data/ file
ls out/data/en/        # new JSON exists; out/data/en/bundle.json contains its key
pnpm start
```

- **View source of the new URL:** full content, `<title>`, canonical, JSON-LD.
- **Navigate to it from another page:** the Network panel shows one `/data/…json` request and no Document. Title and canonical update.
- **Back/forward and reload** behave correctly.
- **Unknown id/slug:** the static 404 appears.
- **In `pnpm dev`:** the page and its JSON both respond, and editing the source shows up after navigation.
