# Offline mode: guaranteed songbook cache, cache status, root page

> **Status: implemented (2026-11-20).** This file is history: why offline mode works as it does, what was tried and dropped, and what is still open.
> How the code works now is in `.github/instructions/offline-mode.instructions.md`. If this file and the instructions differ, the instructions win.

Merged on 2026-11-20 from four plan files:

| Old file | What it was | Where it is here |
|---|---|---|
| `plan-offlineMode.md` | First plan, phases 1–7 (2026-11-19) | "Phases as built", "Version 1" |
| `plan-offlineMode-workflows.md` | Every cache scenario of version 1, step by step, with gaps | "Scenarios", "Misflows" |
| `plan-offlineMode-rethink.md` | The owner's sketch of a simpler worker: 10 primitives and 3 flows | "The rethink" (kept whole) |
| `plan-offlineMode-2.md` | Refactor of the worker to the rethink flows, then "Records with file lists" | "Version 2", "Final flows" |

## Contents

1. Goal
2. Status
3. Decisions
4. How the design changed
5. The rethink
6. Final flows
7. Phases as built
8. Scenarios
9. Misflows found and how they were fixed
10. Ideas that were dropped
11. Tests
12. Not done and open questions

## 1. Goal

1. An opened songbook is always fully cached: every page, its images and the app shell.
2. The cache repairs itself when entries are missing.
3. The reader sees whether a songbook is available offline and how much it takes. Caching is automatic only; there is no button.
4. (Added by version 2) A page data request is answered by small named steps in a fixed order, with less work per session: no 200–500 `cache.put` per book, no full cache listing, no page restore.

State before the work (2026-11-18):

- `precacheBook` in `sw.js` fetched the bundle and wrote one cache entry per page; the bundle itself was not stored.
- `usePrecacheBook` ran once per book per build and trusted the `localStorage` marker `kirtan:precached:<book>`, so an evicted or partly written cache was never repaired. It skipped everything on Save-Data.
- No image was precached, and not the icon font either (the asset regex matched only `.js` and `.css`).
- Nothing in the UI showed the cache state.
- `/` was only a redirect (`PrefRedirect`): a loader, then `window.location.href = '/<book>/'`.

## 2. Status

| Phase | State |
|---|---|
| 1. Bundle `assets` | ✅ 2026-11-19 |
| 2. Service worker | ✅ 2026-11-19, rewritten 2026-11-20 (version 2) |
| 3. Client store, `usePrecacheBook` | ✅ 2026-11-19, updated 2026-11-20 |
| 4. UI (dot, popup, card dot), translations | ✅ 2026-11-20 |
| 5. Root page `/` | ✅ 2026-11-20 |
| 6. Tests | ✅ 2026-11-20 |
| 7. Docs | ✅ 2026-11-20 (`offline-mode.instructions.md`) |

What is left is in section 12.

## 3. Decisions

"Owner" marks an answer of the owner; the rest were proposed in a plan and accepted by building them.

| Topic | Decision | Source |
|---|---|---|
| Page lookup order | Page entry in the cache → bundle (memory, then cache) → network | Owner, rethink |
| Store of pages | The bundle. No cache entry per page; page entries only for pages fetched from the network before the bundle arrived | Owner, rethink |
| Job order | Bundle from the network → store bundle → status "pages are cached" → static files → records | Owner, rethink |
| Which books are cached | The songbook of the current page, automatically, on idle, in every session. Other books only by opening them | v1 |
| `ENSURE_BOOK` from the page | Kept. Not sent on `/`, on the songbook list `/<book>/` and on the admin pages (`/analyze`, `/export`) | Owner |
| Status record | The worker writes what it checked into a small cache entry | Owner |
| Records hold file lists | Each record lists the files; every job checks that each listed file is in the cache | Owner (2026-11-20) |
| Covers | Cached by the book job from `assets.bookImages`, for all songbooks | Owner |
| Shell | Cached in the worker's `install` event, not by the book job | Owner |
| Bundles in memory | An object keyed by book id; every book used in this worker life stays. No limit, no eviction | Owner |
| Job fails offline | The last state stays; no `error` | Owner |
| `IS_LOCAL` (network-first on localhost) | Removed. One flow everywhere. Dev registers no worker | Owner |
| New deploy | Caches stay per build. After a deploy only the opened songbook is cached again; other songbooks lose their green dot until they are opened online | v1 |
| Save-Data | Skips only the content images. Bundle, shell and covers are always cached. No way to load content images by hand | v1 |
| Content images and the dot | They do not decide the dot colour. A book with all pages and no content images is green; the popup shows the image count | v1 |
| HTML pages | Not precached. Offline, an uncached URL gets `/shell/` | v1 |
| Popup text | Translated, as few words as possible; state is shown with the dot, numbers and a progress bar. No buttons | v1 |
| Root page `/` | A real app page: the songbook list of the first songbook; the app moves the reader to their own book without a reload | v1, phase 5 |
| `/` in the shell precache | Not cached on install; offline the shell renders it | Owner (TODO in `sw.js`), replaces v1 5.3 |
| Delay of a job started by a data request | `BOOK_JOB_DELAY_MS` = 2000 | Proposed, v2 |
| Pause after a failed job | `BOOK_JOB_RETRY_MS` = 60 s | Proposed, v2 |

## 4. How the design changed

### Version 1 (2026-11-19): bundle as marker, a cache entry per page

- **"Cached" = the bundle entry exists.** No status record, no checksum. Reasons given: each build has its own cache, so a cached bundle always belongs to the running build; `cache.put` stores an entry whole or not at all.
- **Job `ensureBook`:** bundle → shell and its assets → bundle entry → **every page entry** (`putPages`) → images. The bundle was stored after the shell, so it existed only when the book could start offline.
- **Fetch chain:** page entry → cached bundle (and put all pages back, `restorePages`) → network (and start the job).
- **Counting:** every run did one full `cache.keys()` listing (`listCachedPaths`) to count data files, images and app files, and reported `dataFiles`, `images`, `appFiles`, `bundleBytes` in the status.
- **Localhost:** network-first (`IS_LOCAL`), then the cache chain.
- **Messages:** `ENSURE_BOOK { bookId, storeBigImages }`, `GET_CACHE_STATUS { bookIds }`, `GET_BOOK_CACHE_SIZE { bookId }`. The old `PRECACHE_BOOK` was removed.
- Additions made while building it: a fetch-triggered run used the `storeBigImages` of the last `ENSURE_BOOK` (`lastStoreBigImages`), and a second run followed when a page asked for content images while a run without them was going; books with a bundle of another build were remembered per book (`newerBooks`); `caching` was broadcast only once a run had something to fetch.

### Workflows review (2026-11-20, morning)

Writing every scenario down showed the costs and holes of version 1:

- A full cache listing on every run: every session, every book change. The cache holds about 500 entries per cached book; a run needs to know about 100 of them.
- The 1.6 MB bundle was parsed on every session only to read `assets`.
- A run that failed only because the reader was offline ended with `error`.
- Deploy gap: the idle `ENSURE_BOOK` could reach the old worker, whose cache was deleted a moment later.

It proposed: one full listing only (the popup), key lookups in the job, `GET_BOOK_CACHE_SIZE` → `GET_BOOK_CACHE_INFO`, `ensureBook` again on `controllerchange`.

### The rethink (2026-11-20)

The owner wrote the worker down as 10 primitives and 3 flows (section 5). Main turn: the bundle is the store of pages, so the per-page entries, their restore and the full listing all go away.

### Version 2 (2026-11-20): refactor to the rethink flows

| Topic | Version 1 | Version 2 |
|---|---|---|
| Pages of a cached book | One cache entry per page, written from the bundle, put back when missing | Served from the bundle in memory. No entry per page |
| Bundle in memory | `lastBundle`, one book, filled as a side effect | `bundles` by book id, explicit steps, one in-flight read per book |
| Shell | Cached by the book job, before the bundle | Cached on `install`. An active worker always has a shell |
| Job order | Shell → bundle → pages → images | Bundle → status → shared files → content images → records |
| "Cached" | Bundle entry exists | Bundle entry and status records exist |
| Status | One state + counts of everything | Two parts: `pages` (bundle) + `state`; image counts from the records |
| Start of the job after a data request | At once | After a delay |
| Static check | Full cache listing on every run | A key lookup per file |
| Sizes and page count | In every job result | Only in `GET_BOOK_CACHE_INFO` (popup) |
| Localhost | Network-first | Same flow as production |
| Storing a response | `await cache.put`; a failed put failed the response | Stored in the background; a failed put never fails the response |

Removed from `sw.js`: `IS_LOCAL`, `networkFirst`, `putPages`, `restorePages`, `restores`, `listCachedPaths`, `countCached`, `lastStoreBigImages`, `newerBooks` (became one flag `isOutdated`), `matchPageData`, the `bundle.json` branch of `respondData`, `ensureShell`, `ensureImages`.

### Records with file lists (2026-11-20, later)

The first form of the record was `{ images: { cached, total }, contentImages: { cached, total } }` and it was **trusted**: a complete record ended the job after one read (`isRecordComplete`), and logos and covers were checked once per worker life (`sharedReady`). So a file deleted later was not found by the job.

The owner decided: the records hold the lists of the files, and every job checks each listed file. That made two records:

| Record | Key | Content |
|---|---|---|
| Shared | `/data/cache-status.json` | `appFiles` (shell files, listed on install), `images` (logos + covers) |
| Book | `/data/<book>/cache-status.json` | `contentImages` |

Each group is `{ files, missing }`. Cost: a key lookup per file on every job and two small `cache.put`; no body reads, and no network when nothing is missing. `isRecordComplete` and `sharedReady` are gone. Both records can be opened in the browser for debugging.

### UI and root page (2026-11-20)

Phase 4 and phase 5 were built on version 2; their differences from the first plan are in section 7.

## 5. The rethink

Kept whole, as the owner wrote it (typos included). **It is still true**: the worker follows these flows. The check against the code is below.

```
1. getPageEntryJsonFromNet
2. getPageEntryJsonFromCache
3. storePageEtnryJsonInCache
9. getPageEntryJsonFromBundleJsonInMemeory

4. getBundleJsonFromNet
5. getBundleJsonFromCache
6. getBundleJsonFromMemory
7. storeBundleJsonInCache
8. storeBundleJsonInMemory
10. checkStaticResources (html, css, img)

Flows:

request: id.json
    2. getPageEntryJsonFromCache
    9. getPageEntryJsonFromBundleJsonInMemeory
    1. getPageEntryJsonFromNet
    3. storePageEtnryJsonInCache
    - async check bundle with time delay, as its not present, lock to prevent multiple loads at same time
      4. getBundleJsonFromNet
      7. storeBundleJsonInCache
      8. storeBundleJsonInMemory
      10. checkStaticResources

getPageEntryJsonFromBundleJsonInMemeory:
    6. getBundleJsonFromMemory
    5. getBundleJsonFromCache
    8. storeBundleJsonInMemory
    - load entry bundle json if available

checkStaticResources:
    get resource from cache (not load fully, but check only key)
    if not present - ger resuource from net
    store gotten resource in cache (but get resource from net always store in cache?)
```

### Check against the code (`public/sw.js`)

| Rethink | Code | True? |
|---|---|---|
| 1 `getPageEntryJsonFromNet` | `getPageEntryFromNet` | Yes |
| 2 `getPageEntryJsonFromCache` | `getPageEntryFromCache` | Yes |
| 3 `storePageEtnryJsonInCache` | `storePageEntryInCache` | Yes. Added: a page of another build is not stored |
| 9 `getPageEntryJsonFromBundleJsonInMemeory` | `getPageEntryFromBundle` → `loadBundle` (6 → 5 → 8) | Yes. Added: one read per book at a time |
| 4 `getBundleJsonFromNet` | `getBundleFromNet` | Yes. Added: a bundle of another build is not stored |
| 5, 6, 7, 8 | `getBundleFromCache`, `getBundleFromMemory`, `storeBundleInCache`, `storeBundleInMemory` | Yes |
| 10 `checkStaticResources (html, css, img)` | `checkStaticResources` → `checkSharedFiles` + content images | Yes. HTML and CSS (the shell) are fetched first on `install`, and the job checks them again from the list in the shared record |
| Flow "request: id.json": 2 → 9 → 1 → 3 | `respondData` | Yes |
| "async check bundle with time delay" | `scheduleBook`, `BOOK_JOB_DELAY_MS` | Yes |
| "lock to prevent multiple loads" | `runs` (one job per book), `scheduled`, `bundleReads` | Yes |
| Job: 4 → 7 → 8 → 10 | `runBookJob` | Yes. Added: step 11 (status records) and the status broadcasts |
| "check only key" | `isCached` = `cache.keys(path)` | Yes |
| "get resource from net always store in cache?" | — | Answer: yes. `fetchAndStore` for the worker's own fetches, `storeInBackground` in the fetch handlers |

Not in the rethink, added by version 2: primitives 11 (`getStatusRecord` / `storeStatusRecord`) and 12 (`installShell`), the `ENSURE_BOOK` trigger (the rethink has only the data-request trigger, see Misflow 1), and the failure rules.

## 6. Final flows

Short form; the full description with tables is in `offline-mode.instructions.md`.

### F1. Request `/data/<book>/<file>.json`

```
2  getPageEntryFromCache        → respond
9  getPageEntryFromBundle       → respond   (6 memory → 5 cache → 8 store in memory)
1  getPageEntryFromNet          → respond
3  storePageEntryInCache          (background, only when page.build is this build)
   scheduleBook(bookId)           (background, only when the bundle is in neither memory nor cache)
   network failed               → reject; the router shows the offline note
```

With a cached book, step 2 is a cache miss on every first request of a page. Accepted by the owner: the page keeps its own memory cache (`pageStore`), so a page is asked once per tab.

### F2. Book job `ensureBook(bookId)`

```
   bundle key in the cache → loadBundle (6 → 5 → 8)
   bundle missing:
4    getBundleFromNet
     bundle.build !== SW_VERSION → isOutdated = true, last state stays, stop
7    storeBundleInCache
8    storeBundleInMemory
   status: pages = true
   checkSharedFiles                     (one at a time: jobs of several books share it)
11   getStatusRecord(shared)
     no record, or `/shell/` not cached → cacheShell (the shell step of the install again)
     ensureFiles(appFiles of the record)        key lookup → missing: fetch → store
     ensureFiles(logos + covers of the bundle)
11   storeStatusRecord(shared)
   ensureFiles(content images of the bundle)    Save-Data: lookup only
11 storeStatusRecord(book)
   broadcast { pages: true, state: 'cached', images, contentImages }
```

### F3. Shell on `install`

```
install: event.waitUntil(installShell())
   open kirtan-<build>
   fetch + store /shell/                  (cache: 'no-cache')
   fetch + store the JS/CSS it references
   fetch + store the font referenced in that CSS
   write the shared record { appFiles, images: null }
   skipWaiting()
```

A failed file fails the install, so the old worker and its cache keep working. In version 1 `activate` deleted the old cache before the new shell existed.

### F4. Other requests

| Request | Strategy |
|---|---|
| `/images/**` | cache → network (stored in the background) → other density for covers and thumbnails |
| HTML | network → cached page → `/shell/` → built-in offline page. Unchanged since before the work |
| `/_next/static/**`, other | cache → network |
| Status records | cache only, 404 when missing |
| Non-GET, other origins | not handled |

### F5. Root page `/`

```
build:  /index.html = songbook list of the first songbook + inline script in <head>
script: pick the reader's book; if it is not the first book → <html data-root-pending>  (content hidden)
app:    on mount at `/` → replace-navigation to /<picked>/
          first book    → page data already in the page store, no request
          other book    → its index.json (from the cache when that book is cached)
          load failed   → replace-navigation to /<first>/
        after the commit → remove data-root-pending
```

Pick: the book chosen before → the main book in the browser language → the first book.

## 7. Phases as built

### Phase 1. Build: asset lists in the bundle

`TBookBundle.assets = { shell, bookImages, contentImages }`, all site-relative paths, written by `loadBookBundle`.

Different from the plan: `contentImages` is not a regex over `JSON.stringify(pages)`. `install:post-fetch` lists the images while it already reads every song and page (`scripts/transformContents.js` `getItemImages`: the song's head image plus the resources-repo images in verse translations and page bodies) and writes `source/books/<book>/content-images.json`. `loadBookBundle` reads it (`getContentImages` in `lib/content/resourceImages.ts`). The link pattern is shared in `scripts/resourceImageUrls.js`.

### Phase 2. Service worker

Built as version 1, then rewritten as version 2 (section 4). Notes from the build that still hold:

- `ENSURE_BOOK` from the page carries no `storeBigImages`; the worker reads its own Save-Data flag. The field is only an override for e2e tests.
- `fetchAndStore` is for the worker's own fetches (install, job). The fetch handlers use `storeInBackground`: they must pass a failed response (404) to the page and not throw.
- A bundle that is only in memory is fetched again: the job checks the bundle's cache key first.
- `isOutdated` also stops jobs asked with `ENSURE_BOOK`, not only scheduled ones: they answer with the last state.
- `GET_CACHE_STATUS` leaves out books with nothing cached.
- Density fallback for covers (`x.jpg` ↔ `x@2.jpg`) was not in the owner's first list; kept.

### Phase 3. Client: status store and `usePrecacheBook`

- Store `other/offline/cacheStatus.ts`, hooks `useCacheStatus` / `useBookCacheState`, types in `types/offline.ts`.
- `usePrecacheBook`: on idle, every session and every book change; no `localStorage` marker, no Save-Data return. Leftover `kirtan:precached:*` keys are not removed: nothing reads them.
- `navigator.storage.persist()` is asked once after a book is `cached`.
- `GET_CACHE_STATUS` carries `bookIds` from `__BOOK_IDS__` (a build-time constant): the worker has no list of the songbooks, and looking up nine bundle URLs is cheaper than listing every cache key.
- The store listens to the worker as soon as a book is registered (`setCurrentBook`), not only with the first subscriber, so `controllerchange` can ensure the book.
- `isAvailable` also respects `NEXT_PUBLIC_PREVENT_SERVICE_WORKER`.

### Phase 4. UI

Built: `CacheLed`, `CacheStatusButton` (header, before `HotkeyHint`), `CacheStatusModal`, the green dot on `BookCard`, translation group `OFFLINE`.

Planned popup:

```
┌──────────────────────────────────────┐
│  ● Available offline              ✕  │   dot + one state line
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  62 %           │   only while caching
│                                      │
│  📦 1.6 MB                           │   bundle size
│  💾 4.8 MB                           │   total cache size of the book
│  📄 412 / 412                        │   data files
│  🖼 49 / 49                          │   images
│  ⚙ 18 / 18                           │   app files (HTML, JS, CSS, font, logo)
└──────────────────────────────────────┘
```

Different from the plan:

- **Rows have text labels, not icons.** The icon font has no icon for a bundle, pages, images or app files, so each row is a translated label and a number. The `OFFLINE.*` keys are those labels, not `aria-label`s.
- **`OFFLINE.DATA_FILES` became `OFFLINE.PAGES`** and shows one number (pages in the cached bundle), not `n / n`: a book has no entry per page any more.
- **Where the numbers come from:** the image row is `images` + `contentImages` of the status; the other rows come from `GET_BOOK_CACHE_INFO`, asked when the popup opens and again when the state changes. Rows are shown when the bundle is cached, else only the state line.
- **`pages: true` without the records** shows as `none`: yellow dot, "Not saved". This answered the question version 2 left for phase 4.
- **Header button** has `data-book`, so the e2e helper waits for the dot of that book.
- **Card dot** sits in the top right corner of the cover, on a dark disc, with `OFFLINE.AVAILABLE` as its `aria-label`.

### Phase 5. Root page `/`

Built: `app/page.tsx` renders the songbook list of the first songbook through `AppDocument`; `parsePath('/')` gives that route; `other/router/pickRootBookId.ts` holds the pick; `useAppRouter` moves to the picked book on mount; `PrefRedirect` and its test are deleted.

Different from the plan:

- **`/` is no longer in the shell precache** (plan 5.3 said to keep it). Offline, a `/` that is not in the cache gets `/shell/`, and the router runs the same pick there: the reader's book, else the first book, else the "You're offline" note. A visited `/` is still cached by the HTML fetch handler.
- **One code path for the move:** a `replace` navigation for every target. For the first book the page data is already in the page store, so there is no request and no separate `history.replaceState` branch. Query and hash are kept.
- **The inline script is not the function itself.** It cannot import, so `getRootPendingScript` gives it the rules as data (the ids and the language → book map of `pickRootBookId`). A unit test runs the script and checks it against `pickRootBookId`.
- **The mark `data-root-pending` removes itself after 5 s**, so the content never stays hidden when the app does not start.
- **Fallback book** is the first book, not the fixed `en` of `PrefRedirect` (today the same book).
- **A link to `/` inside the app** is now a client navigation; before it was a document load.

### Phase 6. Tests

See section 11.

### Phase 7. Docs

- New `.github/instructions/offline-mode.instructions.md` (worker, status, dot and popup, debugging).
- `app-architecture.instructions.md`: short "Offline" section pointing there, new "Root page `/`" section.
- `app-routes.instructions.md`: `/` is an app route.
- `todo.md`: finished offline lines removed.

## 8. Scenarios

Every scenario of work with the cache, as the final code behaves. (The old workflows file described version 1; scenarios A1, A2, B2, B6, D3 changed with version 2.)

### A. Book job

**A1. First visit, online**

1. HTML comes from the network. Page data is embedded; no data request.
2. The worker installs (shell cached, shared record written), activates, claims the page.
3. Idle: the page sends `ENSURE_BOOK { bookId }` (not on the songbook list).
4. Bundle key lookup → missing → fetch (`no-cache`), 1 request. Other build → A7.
5. Store the bundle in the cache and in memory. Status: `pages: true`, `caching`.
6. Shared files: app files are looked up (nothing missing, the install just stored them); logos and covers are fetched, 4 at a time. Shared record written.
7. Content images are fetched (not on Save-Data). Book record written.
8. Broadcast `cached` with the counts.
9. The page asks `navigator.storage.persist()` once.

**A2. Return visit, everything cached**

1. Idle: `ENSURE_BOOK`.
2. Bundle key lookup → present. `loadBundle`: parsed once per worker life (needed for the asset lists).
3. A key lookup per file: about 100 (≈20 shell files, ≈50 covers, ≈50 content images). Nothing missing.
4. Both records are written again.
5. Reply `cached`. No `caching` broadcast, no network.

**A3. Return visit, something is missing**

| Missing | What happens |
|---|---|
| A JS, CSS or font file, a logo, a cover, a content image | The job fetches it |
| `/shell/` or the shared record | The shell step of the install runs again |
| The book's record | Status is `pages: true`, `none` until the job ends; the job writes it and fetches nothing |
| The bundle | Fetched again, once. The static files that are still cached are not fetched |
| A page entry | Nothing: pages come from the bundle |

**A4. Save-Data**

1. Content images are looked up, not fetched. The book record lists them as `missing`.
2. State is `cached`; the popup shows e.g. `36 / 49` images.
3. A content image the reader opens is still cached by the image fetch handler (C1).
4. A later session without Save-Data fetches the missing content images.

**A5. Job started by the worker itself**

1. A page data request went to the network and the bundle is not cached (B3).
2. After 2 s the worker starts the job, with its own Save-Data flag.
3. Common case: the neighbour prefetch on a song page (after 1 s) asks for a page before the idle `ENSURE_BOOK`. The app's own `ENSURE_BOOK` usually still wins the race.

**A6. Two callers, one book**

A job is going → the second caller gets the same promise. Its `storeBigImages` is ignored; the next job (next session) uses the right value.

**A7. Bundle or page of a newer deploy**

1. The fetched bundle (or a page from the network) has another `build`.
2. Nothing is stored. `isOutdated` is set: this worker starts no more jobs, and jobs asked with `ENSURE_BOOK` answer with the last state.
3. The router rejects a page of another build and reloads the document into the new build ("Stale page data").

**A8. Job fails**

| Failure | Result |
|---|---|
| No network | The last state stays; no record written |
| Bundle answers 404 / 5xx | `error`; data requests start no new job for 60 s |
| `QuotaExceededError` on put | `error` |
| One file answers with an error status | Skipped, listed as `missing`; state `cached` |

Existing entries stay. The next session runs the job again.

**A9. Job interrupted (tab closed, worker stopped)**

| Stopped | Next job |
|---|---|
| Before the bundle put | Starts as A1; cached files are skipped |
| After the bundle put, before the records | Pages already work offline (`pages: true`, `none`); the job fetches the missing files and writes the records |

**A10. Job while offline**

- Everything cached → `cached`, no network (A2).
- Something missing → the job stops, the last state stays (`cached` stays `cached`, nothing cached stays `none`).

### B. Page data request (`/data/<book>/<file>.json`)

Sent by the router on navigation and by the neighbour prefetch.

| | Case | What happens |
|---|---|---|
| B1 | Page entry cached | Respond from the cache |
| B2 | No page entry, bundle cached | Respond with the page from the bundle (memory, else parse from the cache once). No page entry is written |
| B3 | No page entry, no bundle, online | Fetch, respond, store the page entry, schedule the job (A5) |
| B4 | No page entry, no bundle, offline | The request rejects; the router shows the offline note |
| B5 | A page not in the bundle (wrong URL) | Network → 404, passed to the page; not stored, no job |
| B6 | `bundle.json` itself | Only the worker asks for it, and its own fetch skips the handler |

### C. Other requests

**C1. Images (`/images/**`):** cache → network (stored) → for covers and thumbnails the other density from the cache → reject (broken image).

**C2. HTML:** network (stored under the URL without the query) → cached page → cached `/shell/`, which renders from the page data (B1–B4) → built-in "You're offline" page (503).

**C3. JS, CSS, font (`/_next/static/**`):** cache → network (stored).

**C4. Non-GET, other origins:** not handled.

### D. Status, dot and popup

**D1. Page start:** the first subscriber of the store waits for the worker and sends `GET_CACHE_STATUS { bookIds }`. Worker: per book one bundle key lookup, and for cached bundles two record reads; running jobs override. No full listing.

**D2. During a job:** the worker broadcasts `BOOK_CACHE_STATUS` to every tab: `caching` + progress, then the final state. The store replaces the book's entry; the dot follows.

**D3. Reader clicks the dot — the only full listing:**

1. The popup shows the state line and the image counts from the store.
2. It sends `GET_BOOK_CACHE_INFO { bookId }`.
3. Worker: one full `cache.keys()`; reads the bodies of the book's entries and of the shared entries → `totalBytes`; `bundleBytes` from the bundle entry; `pages` from the bundle; `appFiles` against the list of the shared record.
4. The rows show `…` until the reply. The reply is not kept in the store; a state change asks again.
5. Works offline: no network.
6. Bundle not cached → only the state line.

### E. Deploy and eviction

**E1. New deploy, reader reloads**

1. HTML of the new build comes from the network and registers `sw.js?v=<new build>`.
2. The new worker installs its shell. If that fails, the old worker stays.
3. It skips waiting and activates; `activate` deletes every older cache. All books lose their dot.
4. `controllerchange` → the store asks `GET_CACHE_STATUS` again, then sends `ENSURE_BOOK` for the current book → A1.

**E2. New deploy, old tab stays open**

1. The old page and the old worker keep working from the old cache.
2. A job that has to fetch the bundle, or a page from the network, gets the new build → A7.
3. The next navigation reloads into the new build → E1.

**E3. Browser eviction**

- Browsers evict the storage of a whole origin, not single entries. After it: no cache at all → A1 on the next online visit.
- So partly missing entries come from A8, A9, A4 and manual deletes (devtools, tests), not from eviction.
- `navigator.storage.persist()` makes eviction less likely.

### F. Root page `/`

| | Case | Result |
|---|---|---|
| F1 | Online, no preference, browser language has no book | `/` shows the first book; URL becomes `/<first>/`; no request, no second document |
| F2 | Online, another book chosen before, or browser in its language | Content hidden before paint; that book's list is loaded; URL becomes `/<book>/`; no second document |
| F3 | Offline, `/` not in the cache | The shell is served; it loads the reader's book from the cache, else the first book, else shows "You're offline" |
| F4 | Offline, `/` in the cache (visited before), the reader's book not cached | The first book stays; URL becomes `/<first>/` |

## 9. Misflows found and how they were fixed

Holes found in the rethink flows and in version 1.

| # | Misflow | Fix |
|---|---|---|
| 1 | **The first visit makes no data request.** The HTML carries its page data; on a contents page there is no neighbour prefetch either. With only the data-request trigger the book is never cached | `ENSURE_BOOK` on idle stays |
| 2 | **A cached bundle is never checked again.** In the rethink, step 10 runs only after the bundle came from the network. A failed image, a job stopped after the bundle, or content images skipped under Save-Data would never be repaired | The job runs on every session and checks every file from the records |
| 3 | **Bundle stored before the shell.** A book could look cached while it cannot start offline | The shell moved to `install`: a bundle in the cache always has a shell next to it |
| 4 | **Lock only for the network load.** Navigation and two prefetches arrive together; each would read and parse the bundle (0.3–3 MB) | `loadBundle` keeps one in-flight read per book |
| 5 | **Memory is lost often.** The browser stops an idle worker after about 30 s | No fix needed. It also bounds the memory |
| 6 | **Bundle or page of a newer deploy.** Version 1 stored a page of another build in the old cache; a later offline visit got a page the router rejects again | `storePageEntryInCache` reads `build` and skips the store; one flag `isOutdated` |
| 7 | **A failed store failed the response.** `remember` awaited `cache.put`; on `QuotaExceededError` the fetch handler rejected although the network answered | Respond first, store in `event.waitUntil(…)` |
| 8 | **Deploy: `ENSURE_BOOK` goes to the old worker**, whose cache is deleted a moment later | On `controllerchange` the store refreshes and sends `ENSURE_BOOK` for the current book |
| 9 | **The record looks like a page.** `/data/<book>/cache-status.json` matches the page data pattern | `respondData` answers the records by name, from the cache only |
| 10 | **Removing `IS_LOCAL` changes local builds and e2e.** E2E had run the network-first variant | E2E now runs the production order. After a local rebuild the old worker serves old JS/CSS for one load, until the new HTML registers the new worker |
| 11 | **`error` when offline** (version 1, A10) | Offline keeps the last state |
| 12 | **A trusted record hides deleted files** (first form of the record) | Records with file lists; every job checks every file |

## 10. Ideas that were dropped

| Idea | Why dropped |
|---|---|
| `localStorage` marker `kirtan:precached:<book>` | It cannot know that the cache was evicted or partly written |
| A cache entry per page + restore from the bundle | 200–500 `cache.put` per book and per restore; the bundle already has the pages |
| No status record ("the bundle is the marker") | The bundle says nothing about the static files, and a full listing was needed to count them |
| Trusted record: `isRecordComplete`, `sharedReady` | A file deleted later was never found by the job |
| Full `cache.keys()` listing on every job | About 500 entries per cached book read to learn about 100 |
| Counts of everything in the job result (`dataFiles`, `appFiles`, `bundleBytes`) | They need the full listing; moved to `GET_BOOK_CACHE_INFO` |
| `navigator.storage.estimate()` for the size | Reports the whole origin, padded; cannot give a per-book number |
| `IS_LOCAL` network-first on localhost | Two flows to keep right; dev has no worker anyway |
| A second run when a page asks for content images during a run without them (`lastStoreBigImages`) | The record says what is still owed; the next job fetches it |
| Remembering newer deploys per book (`newerBooks`) | A deploy changes all books: one flag is enough |
| Shell cached by the book job | A book could be "cached" without a shell; a deploy deleted the old cache before the new shell existed |
| `/` in the shell precache | After phase 5 the shell can render `/` |
| Icons in the popup rows | The icon font has no fitting icons |
| Running the pick function itself in the inline script (`toString`) | It imports helpers and would break under minification; data is passed instead |
| Removing leftover `kirtan:precached:*` keys | Harmless, nothing reads them |
| `contentImages` by a regex over the page data | The post-fetch script already reads every song and knows the images |
| A manual "save" or "retry" button | Caching is automatic; failures are retried on the next session |

Other options that were weighed for "how often to verify the files" before "always" was chosen: never; once per worker life per book; when the record is older than N days; when a fetch handler misses a file the record counts as cached; on demand when the popup opens.

## 11. Tests

Verify with `pnpm run type-check && pnpm run lint && pnpm test && pnpm run test:build && pnpm run test:e2e`. Last full run 2026-11-20: 2062 unit, 157 build, 80 e2e, all passed.

| Layer | File | Covers |
|---|---|---|
| data | `tests/data/lib/pageData/index.test.ts` | `assets` lists are sorted, unique, site-relative; `contentImages` equals the images in the page data, for every book |
| build | `tests/build/page-data.test.ts` | Every path in `assets` exists in the build; the bundle has exactly the data files of the book |
| build | `tests/build/site-files.test.ts` | Root page: page data and canonical of the first book, the inline script |
| logic | `tests/logic/other/router/pickRootBookId.test.ts` | The pick rules; the inline script marks the document exactly when the pick is not the first book |
| logic | `tests/logic/other/router/routes.test.ts` | `parsePath('/')` |
| client | `tests/client/other/offline/cacheStatus.test.ts` | Initial request, broadcasts, reply merge, `controllerchange`, `ensureBook`, `getBookCacheInfo` |
| client | `tests/client/other/hooks/useCacheStatus.test.ts` | States, `pages: true` + `none` is not `cached` |
| client | `tests/client/other/router/precache.test.ts` | Idle call, every mount, book change, no call on the songbook list, `persist()` |
| client | `tests/client/other/router/useAppRouter.test.ts` | "on the root page": first book, chosen book, language, fallback, shell |
| ui | `tests/ui/components/common/CacheStatus/*.test.tsx` | Dot per state, button, popup rows per state, "Offline" note, labels per language |
| ui | `tests/ui/components/home/BookCard/BookCard.test.tsx` | Green dot only when cached |
| e2e | `tests/e2e/offline.spec.ts` | See below |
| e2e | `tests/e2e/root.spec.ts` | No preference, chosen book, browser language, three offline cases |

E2E cases in `offline.spec.ts`:

- other songbooks' lists and a visited book work offline, also on pages never opened;
- a book that was not cached says it is offline; the offline note appears once and "Go back" returns;
- the songbook list has the shell cached by the worker and starts no book job;
- a job stores the bundle and both records, and no page entries;
- a page is served from the bundle; no page entry is written;
- a deleted app file is fetched again when the page asks for it;
- a missing bundle is fetched again, once; with everything cached a reload and a job fetch nothing;
- a page of a book that is not cached comes from the network and is stored; the book is cached once;
- without the book record: `pages: true`, `none`; the next job writes it and fetches nothing;
- without the shared record the book is not cached; the next job writes it again;
- files deleted from the cache are fetched by the next job although the records list them;
- an image deleted with the record is the only file the next job fetches;
- a job started offline keeps the last state;
- a page of another build is not stored;
- covers and content images work offline;
- Save-Data skips the content images, not the covers; a later job fetches them; the popup counts them as not cached;
- the dot is yellow, then green; the popup and the card show it;
- offline, the popup has the "Offline" note and the counts.

Not covered: see section 12.

## 12. Not done and open questions

### Not done (out of scope of every plan; some are in `todo.md`)

| Item | Note |
|---|---|
| White page when the network returns | Offline bug, not looked at |
| Forward from a non-cached to a cached page does not work | Offline bug, not looked at |
| Nicer built-in "You're Offline" page of `sw.js` | It is inline HTML with its own colours, English only |
| Page data answers 404: the reader gets a white browser error page | From `todo.md`; not looked at |
| "Download all": caching songbooks that were not opened | By decision |
| Re-caching other songbooks after a deploy | By decision: only the opened book is cached again |
| Offline audio | Not planned |
| A way to load content images by hand under Save-Data | By decision |
| HTML strategy | Unchanged: network-first, every visited page is stored |

### Open questions

1. **A reader who enters through `/` or `/<book>/` caches nothing.** The songbook list starts no job (owner's decision), and since phase 5 the root page lands on a songbook list. The book is cached only after the reader opens one of its pages. Is that still wanted now that `/` is a real entry page?
2. ~~**`<html lang>` after the root move.**~~ Done: `applyHead` (`other/router/head.ts`) sets `<html lang>` to `getBookLocale(bookId)` after every committed page, also after the root pick and in the shell. Tested in `tests/client/other/router/head.test.ts`.
3. ~~**A link to `/` inside the app**~~ Decided (owner): not fixed, no such link exists (header logo goes to the current book; `start_url: '/'` is a document load and runs the pick; the pick replaces `/` in history). Client navigation to `/` would show the first book's list without the pick. Rule in `app-architecture.instructions.md`: link to `getSongbookPath(bookId)`, never to `/`.
4. **Logos.** The shell needs them, but they are listed only in the bundle, so they are cached by the first book job, not on install. Alternative: put the list into `sw.js` at build time. Proposed: leave as is.
5. ~~**Page entries after the bundle is stored.**~~ Decided (owner): kept on purpose. They duplicate bundle pages, but a page entry is answered by one `caches.match`, faster than reading and parsing the bundle. They are few and die with the build's cache. No cleanup. Recorded in `offline-mode.instructions.md`.
6. ~~**A single deleted JS/CSS file is fetched plainly**~~ Decided (owner): by design. `no-cache` is only for fixed URLs whose content changes per build (`/shell/`, `bundle.json`, `/shell/assets.json`): from the HTTP cache they could be of an old build. JS/CSS have hashed names, so a copy from the HTTP cache is always current, and it can come back without the network. Recorded in `offline-mode.instructions.md`.
7. **Lookups against one listing.** A job does about 100 key lookups. Never measured on a phone against one full `cache.keys()` with 1, 3 and 9 cached books.
8. ~~**Bundle parse on every session.**~~ Decided (owner): not worth it. Only the current book's bundle is parsed (0.3–3.1 MB, `es` the largest), once per worker life, inside the worker, and the next page request from the bundle reuses the parsed copy. A cache entry per page stays dropped (see "Ideas that were dropped"). If the parse is ever measured slow on a phone: store `assets` as its own small entry. Recorded in `offline-mode.instructions.md`.
9. **`error` in the popup.** The popup shows "Not saved" for `error` and for `none` alike; `status.error` is not shown anywhere.
10. ~~**Two callers with different Save-Data** (A6)~~ Decided (owner): cannot happen in the app. The page never sends `storeBigImages`; the worker reads its own Save-Data flag, the same for every caller. Only e2e tests (`ensureBookNow`) use the override. A caller joining a running job keeps getting that job's result. Recorded in `offline-mode.instructions.md`.
11. ~~**Absolute image URLs.**~~ Decided (owner): not fixed. Logos, covers, thumbnails and favicons use `PATH.IMG` with the `NEXT_PUBLIC_ORIGIN` prefix; the worker caches site-relative paths. On that origin they are the same key. A preview deploy is built with its own origin, so it is not affected. Only a build opened on an address other than its origin (`www.`, another port, a LAN IP) sends them as other-origin requests the worker does not handle: offline they break there. Offline mode is supported only on the build's `NEXT_PUBLIC_ORIGIN`. Recorded in `offline-mode.instructions.md`.
12. ~~**Total size in the popup**~~ Decided (owner): intended. `bookTotal` is what this book needs offline (its texts and images plus the shared app files), so the totals of two books overlap and do not add up; `allTotal` gives the real size of the cache. May read as confusing; labels and order unchanged. Recorded in `offline-mode.instructions.md`.

### To check by a person

- **Translations of the `OFFLINE` group** for `lv`, `es`, `ru`, `ua`, `pt` were written by the assistant; a native reader should check them.
- **Shared resources repo.** Version 1 says it is the source of `source/translations.json`. The `OFFLINE` group was added only in this repo; copy it there if that is still true.
- **Look of the dot and popup** in a real browser on a phone (8 px dot, touch target, popup rows). Checked only through e2e tests.

### Test gaps

- `public/sw.js` has no unit tests; it is checked only by e2e on Chromium.
- No test spies on `cache.keys()` to prove that a job makes no full listing.
- The delay of a scheduled job (`BOOK_JOB_DELAY_MS`) and the retry pause (`BOOK_JOB_RETRY_MS`) are not asserted.
- Deploy scenarios E1 and E2 (two builds, `controllerchange`) are covered only by the unit test of the store, not end to end.
- A failed install (old worker keeps working) is not tested.
- Quota errors are not tested.
- The shell on `/` with no book loadable is covered by e2e only.
