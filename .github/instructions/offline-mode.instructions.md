---
description: "Use when working on offline mode: the service worker public/sw.js (install, fetch strategies, page data chain, bundles, book job ensureBook, status records cache-status.json, messages ENSURE_BOOK / GET_CACHE_STATUS / GET_BOOK_CACHE_INFO / BOOK_CACHE_STATUS), the cache status store and hooks (other/offline/cacheStatus.ts, useCacheStatus, useBookCacheState), usePrecacheBook, connectivity (useIsOnline), the offline dot and popup (CacheLed, CacheStatusButton, CacheStatusModal, the dot on BookCard), the OFFLINE translations, and the offline e2e tests and helpers. Also how to debug what is cached."
applyTo: ["public/sw.js", "other/offline/**", "other/hooks/useCacheStatus.ts", "other/hooks/useServiceWorker.ts", "other/hooks/useIsOnline.ts", "other/connectivity.ts", "other/router/precache.ts", "types/offline.ts", "components/common/CacheStatus/**", "components/home/BookCard/**", "components/song/OtherTranslations/**", "tests/e2e/offline.spec.ts"]
---

# Offline mode: service worker, cache status, dot and popup

An opened songbook is cached as a whole and then works offline, also on pages never opened. Caching is automatic; the UI only shows the state.

How the app is built (page data, bundle, router, shell document) is in `app-architecture.instructions.md`. Design history, rejected ideas and open questions are in `.github/plans/plan-offlineMode.md`.

## Parts

| Part | File | Job |
|---|---|---|
| Service worker | `public/sw.js` | Caches and serves files; runs the book job; answers messages |
| Registration | `other/hooks/useServiceWorker.ts` | Registers `sw.js?v=<build id>` |
| Status store | `other/offline/cacheStatus.ts` | State of every book in the page; talks to the worker |
| Hooks | `other/hooks/useCacheStatus.ts` | `useCacheStatus()`, `useBookCacheState(bookId)` |
| Precache | `other/router/precache.ts` | `usePrecacheBook`: asks the worker to cache the current book |
| Connectivity | `other/connectivity.ts`, `other/hooks/useIsOnline.ts` | Online / offline flag |
| Dot and popup | `components/common/CacheStatus/` | `CacheLed`, `CacheStatusButton`, `CacheStatusModal` |
| Card dot | `components/home/BookCard/BookCard.tsx` | Dark grey dot on a cached book |
| Types | `types/offline.ts` | Status, records, info reply |
| Asset lists | `lib/pageData/index.ts` `getSharedAssets`, `loadBookBundle` | `/shell/assets.json` (logos, covers) and `assets` of `bundle.json` (content images): what the worker must cache |

## Terms

| Term | Meaning |
|---|---|
| Cache | `kirtan-<build>`, one per build. `activate` deletes the older ones |
| Bundle | `/data/<book>/bundle.json`: all pages of a book + `assets` lists. It is the store of the book's pages |
| Page entry | `/data/<book>/<file>.json` in the cache. Exists only for pages fetched from the network before the bundle arrived; kept after that on purpose (see "Page data chain") |
| Shell | `/shell/`, the JS/CSS it references, the font in that CSS. Cached on install |
| Shared files | The shell files + logos (`shell`) + covers and thumbnails of all books (`bookImages` of `/shell/assets.json`). All cached on install |
| Content images | `/images/resources/**` used by one book (`assets.contentImages`) |
| Book job | One `ensureBook(bookId)` in the worker |
| Status record | `cache-status.json`: lists of files a job checked. Not a file of the site |

## What "cached" means

A book is **cached** when the build's cache has:

- its `bundle.json`;
- its status record `/data/<book>/cache-status.json`;
- the shared status record `/data/cache-status.json` with `images` set (by the install, or by the first job when the install could not read `/shell/assets.json`).

So `cached` means "the bundle is stored and a job has checked the static files". Missing or skipped images do not change the state; the counts show them. HTML pages are not precached: offline, an uncached URL gets `/shell/`, which renders from the page data.

## Registration and install

- `useServiceWorker` registers `sw.js?v=<getBuildId()>`, so each build has its own worker and cache.
- One switch, `isServiceWorkerEnabled()` (`other/offline/serviceWorkerEnabled.ts`), decides for registration, the status store and precache. Off only when `NEXT_PUBLIC_PREVENT_SERVICE_WORKER=true` (or the browser has no service workers); dev (`pnpm run dev`) is no exception.
- When the switch is off, `useServiceWorker` unregisters a worker left from an earlier session, so it stops serving from its cache.
- In dev the build id is set when the dev server starts: the worker's cache serves `/data/**` and `/_next/static/**` cache-first, so edits show only after a dev server restart (new build id → new worker and cache).
- `install` → `installShell`:
  - `cacheShell` stores `/shell/` (`no-cache`), its JS/CSS, the font in that CSS;
  - `cacheSharedImages` reads `/shell/assets.json` (`no-cache`, not stored; built by `app/shell/assets.json/route.ts` from `getSharedAssets()`) and caches the logos and covers of all songbooks with `ensureFiles`. A failed image stays `missing`; a list answering with an error status leaves `images: null`, and the first job reads the list again;
  - writes both lists into the shared record (`appFiles`, `images`). Then `skipWaiting`. `cacheShell` fetches only files the build's cache does not have (a key lookup first), so the job's fallback (shell list missing) refetches only what is gone.
- A failed shell file, or no network, fails the install. The browser drops that worker and tries again on the next page load; the old worker and its cache keep working. So an active worker always has a shell.
- `/` is not part of the shell. Offline the shell renders it (see "Root page" in `app-architecture.instructions.md`).

## Fetch strategies (`public/sw.js`)

One flow everywhere; there is no localhost variant.

| Request | Strategy |
|---|---|
| `/data/<book>/<file>.json` | Page entry of the cache → the book's bundle (memory, then cache) → network. See "Page data chain" |
| `/data/cache-status.json`, `/data/<book>/cache-status.json` | The status records, from the cache only; 404 when there is none. Never fetched from the network |
| `/images/**` | Cache → network. Covers and thumbnails fall back to the other density (`x.jpg` ↔ `x@2.jpg`) when both miss |
| HTML | Network → cached page → cached `/shell/` → built-in "You're Offline" page (503). A fetched page is stored under its URL without the query |
| `/_next/static/**`, other files | Cache → network |
| Non-GET, other origins | Not handled (straight to the network). The connectivity probe is a `HEAD`. Logos, covers, thumbnails and favicons are absolute `NEXT_PUBLIC_ORIGIN` URLs (`PATH.IMG`): a build opened on an address other than its origin (`www.`, another port, a LAN IP) sends them as other-origin requests, and they break offline. Intended: offline mode is supported only on the build's `NEXT_PUBLIC_ORIGIN` (a preview deploy is built with its own) |

A network response is sent first and stored in the background (`storeInBackground`); a failed store (quota) never fails the response.

### Page data chain (`respondData`)

The numbers are the primitives of the design; the function names in `sw.js` match.

```
2  getPageEntryFromCache        → respond
9  getPageEntryFromBundle       → respond   (6 memory → 5 cache → 8 store in memory)
1  getPageEntryFromNet          → respond
3  storePageEntryInCache          (background, only when page.build is this build)
   scheduleBook(bookId)           (background, only when the bundle is in neither memory nor cache)
   network failed               → reject; the router shows the offline note
```

- A page from the bundle is **not** written as a page entry.
- Page entries stored before the bundle arrived stay after it is stored, as duplicates of bundle pages. This is intended: a page entry is answered by one `caches.match`, faster than reading and parsing the bundle. They are few and are deleted with the build's cache. Do not add cleanup for them.
- A page of another build is not stored and sets `isOutdated`.
- A failed response (404) is passed to the page, not stored, and starts no job.

### Bundles in memory

`bundles` keeps the parsed bundle of every book used in this worker life. `loadBundle(bookId)` reads memory → cache with one read per book at a time; it never uses the network. The browser stops an idle worker after about 30 s, so the memory copy helps only within a burst of requests.

The book job parses the whole bundle (up to about 3 MB) only to read `assets`. This is accepted: it is one book, once per worker life, inside the worker, and the next page request from the bundle reuses the parsed copy. Do not split pages into cache entries of their own (200+ `cache.put` per book, a book can be half-cached). If the parse is ever measured slow, store `assets` as its own small entry.

## Book job `ensureBook(bookId, { storeBigImages? })`

Makes sure a book is cached and fetches only what is missing. One job per book at a time (`runs`); later callers get the running promise.

1. **Bundle.** Its cache key exists → `loadBundle`, no network. Else fetch it (`no-cache`). If its `build` is not the worker's, a newer deploy is live: store nothing, set `isOutdated`, the last state stays. Else store it in the cache and in memory.
2. **Shared files** (`checkSharedFiles`; jobs of several books at the same time share one check, `sharedCheck`):
   - app files, from the list in the shared record. Without the record, or without `/shell/` in the cache, the shell step of the install runs again;
   - logos and covers, from the list in the shared record. Without it (`images: null` or no record), `/shell/assets.json` is read again (`no-cache`); its error status fails the job (`error`);
   - the shared record is written.
3. **Content images** of the bundle. On Save-Data they are only looked up, not fetched. The book's record is written.
4. Broadcast `cached` with the counts.

Rules:

- **Every job checks every file.** A check is a key lookup (`cache.keys(url)`, no body read). Missing files are fetched 4 at a time (`IMAGE_CONCURRENCY`). The records are not trusted.
- **Save-Data:** the worker reads `self.navigator.connection?.saveData` itself. `storeBigImages` in the message only overrides it (e2e tests). A caller that joins a running job gets its result; its `storeBigImages` is ignored. Intended: the app never sends it, so all callers share the worker's flag.
- **`caching` is broadcast only once a job has something to fetch.** A job that finds everything cached goes straight to `cached`: no network, no yellow blink.

What starts a job:

| Trigger | When | Delay |
|---|---|---|
| `ENSURE_BOOK` from `usePrecacheBook` | browser idle, on every session and every book change | none |
| `ENSURE_BOOK` on `controllerchange` | a new worker took over (deploy) | none |
| `scheduleBook` | a page came from the network and the bundle is not cached | `BOOK_JOB_DELAY_MS` (2 s) |

`scheduleBook` does nothing while a job of the book runs or waits, after `isOutdated`, and within `BOOK_JOB_RETRY_MS` (60 s) of a failed job.

Failures:

| Failure | Result |
|---|---|
| No network (`OfflineError`) | The job stops; the last state stays. No `error`, no record written |
| Bundle answers 404 / 5xx (`StatusError`) | `error` |
| `cache.put` fails (quota) | `error` |
| One file answers with an error status | Skipped, listed as `missing`; the next job tries again |
| Bundle or page of another build | `isOutdated`: this worker starts no more jobs; the page reloads into the new build on its next navigation |

## Status records

Kept in the build's cache; the worker answers them itself and never fetches them.

| Record | Key | Content | Written by |
|---|---|---|---|
| Shared | `/data/cache-status.json` | `appFiles` (shell files), `images` (logos + covers; `null` only when the install could not read `/shell/assets.json`) | install, then every job |
| Book | `/data/<book>/cache-status.json` | `contentImages` | every job of the book |

Each group is `{ files, missing }`: every path the last check went through, and those not in the cache after it. Types: `TSharedCacheRecord`, `TBookCacheRecord`, `TCachedFiles`.

## Status and messages

```ts
type TBookCacheStatus = {
  bookId: string;
  pages: boolean;                                   // the bundle is in the cache
  state: 'none' | 'caching' | 'cached' | 'error';
  progress?: number;                                // 0..1 while caching
  error?: string;
  images?: TCacheCount;                             // logos + covers, from the shared record
  contentImages?: TCacheCount;                      // from the book's record
};
```

| Moment | `pages` | `state` |
|---|---|---|
| Nothing cached | false | `none` |
| Job fetches the bundle | false | `caching` |
| Bundle stored, files being fetched | true | `caching` |
| Records written | true | `cached` (+ counts) |
| Job stopped after the bundle, before the records | true | `none` |
| Bundle answered 5xx | false | `error` |
| Job failed offline | last state | last state |

Requests carry a `MessageChannel` port for the reply:

| Message | Reply |
|---|---|
| `{ type: 'ENSURE_BOOK', bookId, storeBigImages? }` | final `TBookCacheStatus` |
| `{ type: 'GET_CACHE_STATUS', bookIds }` | `{ build, books }`: status of each book with a cached bundle (one key lookup and two record reads per book); running jobs override. Books with nothing cached are left out. The page sends the ids, because the worker has no list of the songbooks |
| `{ type: 'GET_BOOK_CACHE_INFO', bookId }` | `TBookCacheInfo` `{ bookId, pages, texts, bookImages, appImages, appHtml, appResources, bookTotalBytes, allTotalBytes }` |

`GET_BOOK_CACHE_INFO` is the only place that lists the whole cache and reads entry bodies (Cache Storage has no size API). Ask it only on demand, i.e. when the popup opens. Every cache entry falls into one group of `{ bytes, count }`, checked in this order:

| Group | Entries |
|---|---|
| `texts` | `/data/<book>/**` of this book: bundle, page entries, its record. `/data/<other book>/**` counts only in `allTotalBytes` |
| `bookImages` | `/images/resources/**` listed in this book's bundle (`total`: listed). Other content images count only in `allTotalBytes` |
| `appImages` | Other `/images/**`: logos, covers, thumbnails (`total`: listed in `images` of the shared record, plus any other cached) |
| `appHtml` | Entries with `Content-Type: text/html`: `/shell/` and pages of every book |
| `appResources` | Everything else: JS, CSS, fonts, `/data/cache-status.json` |

`bookTotalBytes` is the sum of the five groups (this book + the app); `allTotalBytes` is the whole cache (the app + every book). This is intended: `bookTotalBytes` is what the book needs offline, so the shared app groups count in every book and the totals of two books do not add up.

Broadcast to every page of the site (also uncontrolled ones) on progress and at the end of a job: `{ type: 'BOOK_CACHE_STATUS', status }`.

## Client

- **Status store** `other/offline/cacheStatus.ts` (same pattern as `connectivity.ts`: module state + `useSyncExternalStore`):
  - `isAvailable` is false while `isServiceWorkerEnabled()` is false (disabled by env, unsupported browser) or no worker answers.
  - The first subscriber sends `GET_CACHE_STATUS` with `__BOOK_IDS__` (ids of all songbooks, a build-time constant from `next.config.ts`). The reply replaces the entries, except those a broadcast updated while the request was on its way.
  - `BOOK_CACHE_STATUS` broadcasts update single books. The state object is replaced, never mutated.
  - On `controllerchange` it asks again and then sends `ENSURE_BOOK` for the current book (`setCurrentBook`), because the last one may have gone to the old worker.
  - `ensureBook(bookId)` sends `ENSURE_BOOK`. `getBookCacheInfo(bookId)` sends `GET_BOOK_CACHE_INFO`; its reply is not stored.
- **Hooks:** `useCacheStatus()` gives the store state. `useIsBookReachable()` gives `(bookId) => boolean`: true online or without a worker; offline only when the book's bundle is cached (`status.pages`), since its pages come from the bundle. `useBookCacheState(bookId)` gives `'unavailable' | 'none' | 'caching' | 'cached' | 'error'`; `unavailable` on the server and without a worker, so the static HTML has no dot and there is no hydration mismatch.
- **Precache** `usePrecacheBook(bookId)` (called in `AppRoot`): registers the book with `setCurrentBook` and calls `ensureBook` on idle (`requestIdleCallback`, or 3 s in Safari). Once the book is `cached` it asks `navigator.storage.persist()` once. Skipped when `isServiceWorkerEnabled()` is false and on the songbook list `/<book>/` (kind `book-list`: `AppRoot` passes no book id).
- **Connectivity:** `useIsOnline()`. `navigator.onLine` is trusted only when `false`; otherwise a `HEAD /sw.js` probe decides. It checks on start, on `online`/`offline`, when the tab becomes visible, every 10 s while offline, and when `checkConnectivity()` is called after a failed request.
- **Shell document:** `/shell/` is `AppDocument` with no data. Served for an uncached URL, `useAppRouter` loads that URL's JSON and renders it; if that fails it shows "You're offline".

## Dot and popup (`components/common/CacheStatus/`)

There is no button that starts or stops caching. Do not add one without a decision: failures are retried on the next session.

| Component | What it does |
|---|---|
| `CacheLed` | 8 px dot, `data-status` = the state. Green: `cached`. Yellow: `none`, `error`. Yellow, pulsing: `caching`. Not rendered: `unavailable`. With `label` it is `role="img"`, else `aria-hidden` |
| `CacheStatusButton` | In `Header__actions`, before `HotkeyHint`. Not on the songbook list (`/` and `/<book>/`, kind `book-list`: `getChrome` sets `hideCacheStatus`), which caches no book. Holds the dot of the header's book; `data-book` = the book id; `aria-label` = the state line. 32 × 32 px touch target. Opens the popup |
| `CacheStatusModal` | `AppModal` with the state line and the details |
| `BookCard` | Small dark grey dot (no backdrop) in the bottom right corner of the card when the book is `cached`; nothing otherwise (no yellow on cards). `OtherBooksCard` has no dot |
| `BookCard` offline | Greyed out (`BookCard--disabled`), not a link, does not save the book choice when `useIsBookReachable()` says no |
| `SongbookList` (other translations popup, `components/song/OtherTranslations/`) | Greys out unreachable books the same way (`SongBookItem` `disabled`). The current book always stays a link |

Popup content:

| Element | Shown | Source |
|---|---|---|
| State line with the dot | always | `OFFLINE.AVAILABLE` / `OFFLINE.SAVING` / `OFFLINE.NOT_SAVED` |
| "Offline" note | `useIsOnline()` is false | `FEEDBACK.OFFLINE` |
| Progress bar + percent | state is `caching` | `status.progress` |
| Rows `texts` (`pages · size`), `bookImages`, `appImages` (`cached / listed · size`, just `count · size` when all are cached), `appResources`, `appHtml` (`count · size`), `bookTotal` (size) | the bundle is cached (`status.pages`) | `getBookCacheInfo`; `…` until the reply |
| Row `allTotal` (size) | the reply has come and its formatted size differs from `bookTotal` (other books are cached too) | `getBookCacheInfo` |

- `getBookCacheInfo` is asked when the popup opens and again when the state changes. A reply for another book is ignored.
- A book with the bundle but without the records (`pages: true`, `none`) shows as yellow, "Not saved".
- Rows are a translated text label and a number (the icon font has no fitting icons).
- Colours: `--cache-ready-color`, `--cache-pending-color` in `styles/variables.scss`.
- Texts: group `OFFLINE` in `source/translations.json` (`AVAILABLE`, `NOT_SAVED`, `SAVING`, `TEXTS`, `BOOK_IMAGES`, `APP_IMAGES`, `APP_RESOURCES`, `APP_HTML`, `BOOK_TOTAL`, `ALL_TOTAL`). Follow `translations-schema.instructions.md` when changing them.

The dot is shown wherever the worker runs, also in dev; set `NEXT_PUBLIC_PREVENT_SERVICE_WORKER=true` to work without it.

## Asset lists (build)

The worker cannot list directories, so the build writes the lists of files it must cache. Each list has one place:

| List | Where | Content |
|---|---|---|
| `shell` | `/shell/assets.json` (`getSharedAssets()`) | Files of `public/images/svg/` (logos) |
| `bookImages` | `/shell/assets.json` (`getSharedAssets()`) | Covers and thumbnails of all songbooks, both densities |
| `contentImages` | `assets` of `bundle.json` (`loadBookBundle`) | `/images/resources/**` of this book, from `source/books/<book>/content-images.json` (written by `install:post-fetch`) |

All paths are site-relative. The page asks for images with the absolute `NEXT_PUBLIC_ORIGIN` prefix; both resolve to the same cache key only when the site is opened on that origin.

## Debugging what is cached

Use a real build and the DevTools console of a page the worker controls. `curl` cannot see any of this.

```js
// Shared files: shell (appFiles) and logos + covers (images)
await (await fetch('/data/cache-status.json')).json()

// One book: content images
await (await fetch('/data/en/cache-status.json')).json()

// Every cached path
const cache = await caches.open((await caches.keys())[0]);
(await cache.keys()).map((r) => new URL(r.url).pathname)
```

- The worker logs its main events with the prefix `[sw <build>]` (`log` / `logError` in `sw.js`): install and its file count, activate and the deleted old caches, each book job (start, bundle fetch, "fetching missing files", end state with time and counts, offline stop, failure), the shared files check, a scheduled job, and a newer deploy (`isOutdated`). Page events use `[sw]`: registration with the build id, and a new worker taking control. Keep it to these events: no log per request.
- A 404 for a record means no job has finished yet, or the worker does not control the page yet (reload once).
- The same entries are in DevTools → Application → Cache storage → `kirtan-<build>`.
- The popup of the header dot shows the sizes and counts.

## Rules

- **The bundle is the store of pages.** Do not write a page entry for a page that came from the bundle. Do not delete the page entries stored before the bundle: they answer faster.
- **`no-cache` only for fixed URLs whose content changes per build:** `/shell/`, `bundle.json`, `/shell/assets.json`. From the browser's HTTP cache they could be of an old build. Hashed JS/CSS and fonts (`/_next/static/**`) are fetched plainly: a copy from the HTTP cache is always current, and it can come back without the network.
- **No full cache listing in a job or on page start.** `cache.keys()` without an argument belongs only to `getBookCacheInfo`.
- **The worker's own fetches do not pass its `fetch` handler.** Use `fetchAndStore` there. Fetch handlers use `storeInBackground` and must pass a failed response to the page.
- **Do not trust the records.** A job looks up every listed file.
- **Offline is not an error.** A job that fails without a network keeps the last state.
- **Shell files are listed only on install** (the worker reads the cached HTML and CSS). Logos and covers are listed only in `/shell/assets.json`; the worker keeps that list in the shared record. Content images are listed only in the bundle.
- **Keep `types/offline.ts`, the message tables above and `sw.js` in sync.** `sw.js` is plain JS and is not type-checked.
- **The worker has no book list.** Anything that needs all book ids gets them from the page (`__BOOK_IDS__`).
- When behaviour here changes, update this file.

## Tests

| What | Where |
|---|---|
| Worker behaviour, dot, popup (real browser) | `tests/e2e/offline.spec.ts` |
| Root page offline | `tests/e2e/root.spec.ts` |
| Status store | `tests/client/other/offline/cacheStatus.test.ts` |
| Hooks | `tests/client/other/hooks/useCacheStatus.test.ts` |
| Precache | `tests/client/other/router/precache.test.ts` |
| Dot, button, popup | `tests/ui/components/common/CacheStatus/` |
| Card dot | `tests/ui/components/home/BookCard/BookCard.test.tsx` |
| Unreachable books greyed out offline | `tests/ui/components/song/OtherTranslations/SongbookList.test.tsx`, `tests/ui/components/home/BookCard/BookCard.test.tsx` |
| `assets` lists, `/shell/assets.json` | `tests/data/lib/pageData/index.test.ts`, `tests/build/page-data.test.ts` |

E2E helpers in `tests/helpers/e2e.ts`: `waitForWorker`, `waitForBookCached` (waits for the green header dot of that book, so the page on screen must be a page of the book), `ensureBookNow`, `getBookCacheStatus`, `getBookCacheInfo`, `getStatusRecord`, `listCachedPaths`, `deleteCached`, `recordRequests`, `getBookJobFiles`, `getBookBundle`.

`sw.js` has no unit tests: it is checked only by e2e, so after changing it run:

```sh
pnpm run test:build && pnpm run test:e2e
```

`test:e2e` runs on the existing test build; rebuild first after code changes.
