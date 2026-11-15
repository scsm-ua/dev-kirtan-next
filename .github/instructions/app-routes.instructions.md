---
description: "Use when adding, renaming or removing a page/URL/route, or when asking which file declares a route: the registry of every app route (HTML page.tsx, /data/ JSON handler, TRoute/TPageData kind, loader, view, chrome, metadata, JSON-LD, static params) and of the full-load routes (home, analyze, export, shell, test, 404, sitemap, robots, manifest, legacy .html). Has step-by-step recipes for a new root page, a parametrized page, a new content item type, and a full-load page."
applyTo: ["app/**/page.tsx", "app/**/route.ts", "other/router/routes.ts", "components/app/views/**", "lib/pageData/**", "types/pageData.ts"]
---

# Routes registry and how to add a route

Concepts (one loader, HTML + JSON, client router, offline) are in `app-architecture.instructions.md`. URL builders and the trailing-slash rule are in `paths.instructions.md`.

## How a route is declared

An app page is declared in **eight places**. Each has one job, and TypeScript enforces most of the links between them.

| # | File | What you declare |
|---|---|---|
| 1 | `other/paths.ts` | URL segment (`SONGBOOK_PAGE.*`) and path builder |
| 2 | `types/pageData.ts` | `TRoute` variant (what to load) and `TPageData` kind with its data type (what was loaded) |
| 3 | `other/router/routes.ts` | URL → route (`parsePath`), route → URL (`getRoutePath`), route ↔ data file (`getRouteFile`, `parseItemFile` / `parseAudioFile`) |
| 4 | `lib/pageData/loaders.ts` | `loadPageData` case: builds `data` and `head` from `lib/*` and `other/metadata/*` |
| 5 | `lib/pageData/index.ts` | Route listing (`listItemRoutes` / `listAudioRoutes`) → JSON files and the offline bundle |
| 6 | `app/data/[bookId]/**/route.ts` | JSON handler that emits `/data/…json` (usually an existing one) |
| 7 | `components/app/views/*` + `registry.ts` | View component, `VIEWS` entry, `getChrome` case (main class, footer page, analytics) |
| 8 | `app/[bookId]/**/page.tsx` | Static HTML: `generateStaticParams`, `generateMetadata`, `loadPageData` → `<AppDocument page extras>` |

Plus, when relevant: `app/sitemap.ts`, JSON-LD in `other/metadata/LdJson*.tsx`, translations, hotkeys, and links in Header / Footer / index pages.

Naming convention: for root pages, **kind = URL segment = data file name** (`contents` → `/en/contents/` → `/data/en/contents.json`). `getRoutePath` and `getRouteFile` fall back to `route.kind` for them, so root pages need no `switch` case.

## App routes (rendered by `AppRoot`, navigated client-side)

In the table, `en` stands for any `bookId`, and every page file is under `app/[bookId]/`.

| URL | Page file | Data file | `TRoute` → `TPageData.kind` | View | `generateMetadata` | Static params | `extras` (JSON-LD) |
|---|---|---|---|---|---|---|---|
| `/en/` | `page.tsx` | `/data/en/index.json` | `book-list` | `BookListView` | `getBookListPageMeta` | `getBookIdParamList` | `LdJson` (`BOOK_LIST_PAGE`) |
| `/en/contents/` | `contents/page.tsx` | `/data/en/contents.json` | `contents` | `ContentsView` | `getContentsPageMeta` | `getBookIdParamList` | `LdJson` (`CONTENTS_PAGE`) |
| `/en/a-z/` | `a-z/page.tsx` | `/data/en/a-z.json` | `a-z` | `AZView` | `getAzPageMeta` | `getBookIdParamList` | `LdJson` (`A_Z_PAGE`) |
| `/en/authors/` | `authors/page.tsx` | `/data/en/authors.json` | `authors` | `AuthorsView` | `getAuthorsPageMeta` | `getBookIdParamList` | `LdJson` (`AUTHORS_PAGE`) |
| `/en/search/` | `search/page.tsx` | `/data/en/search.json` | `search` | `SearchView` | `getSearchPageMeta` | `getBookIdParamList` | — |
| `/en/audio/` | `audio/page.tsx` | `/data/en/audio/index.json` | `audio` | `AudioView` | `getAudioPageMeta` | `getAudioBookIdParamList` | `LdJsonAudio` |
| `/en/audio/<singerId>/` | `audio/[singerId]/page.tsx` | `/data/en/audio/<singerId>.json` | `audio-singer` | `AudioView` | `getAudioSingerPageMeta` | `getSingerParamList` | `LdJsonAudio` |
| `/en/<slug>/` (song) | `[slug]/page.tsx` | `/data/en/<slug>.json` | `item` → `song` | `SongBody` | `getContentMeta` | `getSongSlugParam` | `LdJsonSong` |
| `/en/<slug>/` (markdown page) | `[slug]/page.tsx` | `/data/en/<slug>.json` | `item` → `page` | `PageBody` | `getContentMeta` | `getSongSlugParam` | `LdJsonPage` |

Where things live for these routes:

- **Views:** `components/app/views/` (`SongBody` and `PageBody` are in `components/content/`).
- **Metadata builders:** `other/metadata/`.
- **`bookId` static params:** the root `app/layout.tsx` (Next issue #53717).
- **`dynamicParams = false`:** set on `[slug]` and `audio/[singerId]`.

JSON handlers:

| Handler | Emits | Lists routes with | Parses file with |
|---|---|---|---|
| `app/data/[bookId]/[file]/route.ts` | book root, contents, a-z, authors, search, every song/page | `listItemRoutes` (needs only `contents.json`, so it is cheap) | `parseItemFile` |
| `app/data/[bookId]/audio/[file]/route.ts` | audio index and singers (only for books with audio) | `listAudioRoutes` (scans song files) | `parseAudioFile` |
| `app/data/[bookId]/bundle.json/route.ts` | `/data/en/bundle.json`, all of the above for one book | `listRoutes` = items + audio | — |

All three handlers set `dynamic = 'force-static'` and `dynamicParams = false`, and declare `generateStaticParams`.

## Full-load routes (plain documents, not part of the app)

`parsePath` returns `null` for these, so links to them load a new document. Exclusions live in `routes.ts`: `NON_APP_ROOTS` (`_next`, `404`, `data`, `images`, `shell`, `test`) and `NON_APP_PAGES` (`analyze`, `export`). Any path containing a `.` is also excluded.

| URL | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | `PrefRedirect` to the preferred book |
| `/en/analyze/` | `app/[bookId]/analyze/page.tsx` | Old `Layout`, noindex. See `analyze-songbooks.instructions.md` |
| `/en/export/` | `app/[bookId]/export/page.tsx` + `layout.tsx` | Bare document, noindex. See `songbook-export.instructions.md` |
| `/shell/` | `app/shell/page.tsx` | `AppDocument page={null}`, noindex; offline fallback for the service worker |
| `/test/`, `/test/player/` | `app/test/**` | Playgrounds |
| 404 | `app/global-not-found.tsx` → `NotFound` | Static `404.html`; also redirects old `.html` URLs on the client |
| `/en/<slug>.html` | `scripts/postbuild.js` | Meta-refresh redirects to the new URLs |
| `/sitemap.xml`, `/robots.txt`, `/manifest.json` | `app/sitemap.ts`, `app/robots.ts`, `app/manifest.json/route.ts` | `robots` disallows `/data/` and `/shell/` |
| `/sw.js`, `/images/**` | `public/` | Service worker and static files |

---

## Recipe A — new root page (`/en/<segment>/`)

Example: a `favorites` page with data `{ book, items }`.

1. **Path** (`other/paths.ts`): add `FAVORITES: 'favorites'` to `SONGBOOK_PAGE`. Hotkey song detection picks it up automatically.
2. **Types** (`types/pageData.ts`):
   - Add `| typeof SONGBOOK_PAGE.FAVORITES` to `TRootPageKind`. The `TRoute` variant comes with it.
   - Add `export type TFavoritesData = { … }`. Use plain JSON only: no functions, Maps or Dates.
   - Add `| TEnvelope<'favorites', TFavoritesData>` to `TPageData`.
3. **Router** (`other/router/routes.ts`): add the constant to `ITEM_ROOT_PAGES`. `parsePath` and `parseItemFile` then recognise it; `getRouteFile` and `getRoutePath` already fall back to `kind`.
   - ⚠ A root segment shadows a song slug with the same name.
4. **Metadata** (`other/metadata/getFavoritesPageMeta.ts`): `({ params }) => Promise<Metadata>`, like `getContentsPageMeta`. Pass `page: SONGBOOK_PAGE.FAVORITES` to `getPageMeta` so canonical/hreflang are right.
5. **Loader** (`lib/pageData/loaders.ts`): add a case:
   ```ts
   case 'favorites':
     return make(route, 'favorites', toHead(await getFavoritesPageMeta({ params })), {
       book,
       items: getFavorites(bookId)
     });
   ```
   Return `null` when the book has no such page (as `audio` does). Do **all** server work here, e.g. markdown → HTML or file reads.
6. **Listing** (`lib/pageData/index.ts`): add `{ kind: SONGBOOK_PAGE.FAVORITES, bookId }` to `listItemRoutes`. The JSON file and the bundle entry follow automatically.
7. **View** (`components/app/views/FavoritesView.tsx`):
   ```tsx
   export default function FavoritesView({ page }: TViewProps<'favorites'>) { … }
   ```
   - Must be client-safe: no `lib/*` data calls and no `other/metadata/*`.
   - Import its SCSS here.
   - Register it in `VIEWS` in `registry.ts`; TypeScript errors until you do.
   - Add a `getChrome` case only if the default (`{ bookId, pageType: kind }`) isn't enough.
8. **HTML route** (`app/[bookId]/favorites/page.tsx`): copy `contents/page.tsx`:
   ```tsx
   export const generateMetadata = getFavoritesPageMeta;
   export const generateStaticParams = getBookIdParamList;

   async function FavoritesPage({ params }: BookListPageProps) {
     const { bookId } = await params;
     const page = await loadPageData({ kind: SONGBOOK_PAGE.FAVORITES, bookId });
     if (!page) notFound();
     return <AppDocument extras={<LdJson … page={SONGBOOK_PAGE.FAVORITES} />} page={page} />;
   }
   ```
9. **Extras:**
   - links built with `getSongbookPagePath(bookId, SONGBOOK_PAGE.FAVORITES)`;
   - `app/sitemap.ts` if the page is indexed;
   - strings in `source/translations.json` + schema (`translations-schema.instructions.md`);
   - a hotkey (`global-hotkeys.instructions.md`).
10. **Verify:** see the checklist at the end.

**Expensive data** (scans every song file, like audio): don't add it to `listItemRoutes`, because in dev that would slow every data request. Create `app/data/[bookId]/<segment>/[file]/route.ts` with its own `list<X>Routes` and `parse<X>File`, give it a `getRouteFile` case `<segment>/index.json`, and add the list to `listRoutes` so the bundle includes it. The audio handler is the template.

## Recipe B — page with a parameter (`/en/<segment>/<id>/`)

Template: `audio-singer`.

1. **`TRoute`:** `| { kind: 'x-item'; bookId: string; xId: string }`, plus a `TEnvelope<'x-item', TXItemData>`.
2. **`routes.ts`:**
   - Add a `parsePath` branch before the root-page lookup (`page === SEGMENT` → `xId ? x-item : x-index`). Paths have at most three segments; extend the `rest.length` check if you need more.
   - Add `getRouteFile` → `` `${SEGMENT}/${route.xId}.json` `` and `getRoutePath` → a builder in `other/paths.ts`.
   - Add `parseXFile`.
3. **Loader:** look up the id and return `null` when it is unknown. HTML then gets `notFound()` and JSON gets a 404, so the client falls back to the static 404.
4. **Handler** `app/data/[bookId]/<segment>/[file]/route.ts`:
   - `generateStaticParams` returns `file` **without** the segment prefix and **with** `.json`.
   - `GET` → `respondWithPageData(parseXFile(bookId, file))`.
   - Add the list to `listRoutes`.
5. **Page** `app/[bookId]/<segment>/[xId]/page.tsx`: `generateStaticParams` over all ids, `dynamicParams = false`, metadata builder, `AppDocument`.
6. **View and registry** as in Recipe A. Add a `getChrome` case with `itemId: page.route.xId` so analytics tracks each item separately.

## Recipe C — new content item type (shares `/en/<slug>/`)

Songs and markdown pages share route kind `item`; the real type is resolved in `loadItem`.

1. Content handler, type discriminator and source data: follow `pages.instructions.md` (`lib/content/<type>/`, `ITEM_TYPE`, `transformContents.js`).
2. `types/pageData.ts`: `| TEnvelope<'<type>', T<Type>Data, 'item'>`. The third argument ties it to the `item` route.
3. `lib/pageData/loaders.ts` `loadItem`: add a branch on `item.type` that loads through the handler and puts pre-rendered values into `data` (e.g. `bodyHtml`, not raw markdown).
4. View (`components/content/<Type>Body.tsx` inside `ContentShell`) → `VIEWS` → `getChrome` case (`className: 'ContentPage'`, `itemId`, `page`, `pageType`).
5. `app/[bookId]/[slug]/page.tsx`: add JSON-LD `extras` for the new kind if needed. Nothing else changes: listing, handler, `parsePath` and sitemap are slug-based.

## Recipe D — page that must stay a full document load

Admin, tool or one-off pages that don't use `AppDocument`:

1. Create `app/[bookId]/<segment>/page.tsx` using `Layout` (the old chrome: header, footer, hotkeys), or a dedicated `layout.tsx` for a bare document.
2. Add the segment to `SONGBOOK_PAGE` **and** to `NON_APP_PAGES` in `routes.ts`. Otherwise the router intercepts links, requests `/data/en/<segment>.json`, gets a 404 and only then reloads.
3. For a new top-level folder (`app/<name>/`), add `<name>` to `NON_APP_ROOTS`, unless its paths contain a `.`.
4. Use `noindex` and leave it out of the sitemap if it is internal. In hotkeys, `navigate()` still works: it does a full load for non-app paths.

## Removing or renaming a route

Undo the same eight places. Search for the kind string and the `SONGBOOK_PAGE` constant. For a renamed public URL, consider a redirect page (`scripts/postbuild.js` pattern), because old links and the sitemap are indexed.

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
