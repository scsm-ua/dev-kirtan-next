## Plan: Static HTML + JSON-driven SPA navigation

Keep the Next.js static export as the HTML generator and add our own JSON client router on top. Every reader page gets a prebuilt page-data JSON, built by the same loader that feeds the static HTML. One persistent client app renders views from that data, intercepts internal links, fetches the next page's JSON and uses `history.pushState`. The player dock moves into that persistent app, so playback survives navigation.

The two Next.js features this rests on are documented and were checked against the Next 16.2.7 source (the installed version), but not yet run in this repo: static route handlers that emit `.json` files, and `history.pushState` that changes the URL without touching the mounted tree. Phase 0 confirms both at runtime.

**Decisions (from your answers)**
- URLs stay `/<bookId>/<slug>/`.
- JSON navigation covers the songbook root, contents, a-z, authors, search, audio, singer pages, and song/page items.
- Analyze and export stay full-page loads; home `/`, the 404 page and `/test/*` are also unchanged.
- After navigation the dock keeps the queue of the page where playback started, and its title links back to that page.
- Offline precache is the final phase: per-page JSON for navigation plus one bundle JSON per songbook.
- Static 404, legacy `.html` redirects, `.nojekyll`, sitemap, robots and manifest stay as they are.

**Why not a built-in Next.js solution**
- Pages Router `getStaticProps` emits HTML + JSON per page out of the box, but it means moving reader routes to the legacy router, importing global SCSS only in `_app`, and replacing the Metadata API with `next/head`.
- App Router `next/link` needs no router code, but navigation loads Next's internal `.txt` payloads: no plain JSON and no one-file songbook bundle. It is the fallback for Phase 3 if the Phase 0 history check fails; Phases 1, 2 and 4 stay the same.
- No third-party library gives JSON-per-page navigation on the App Router.

**Steps**

*Phase 0 — Runtime confirmation (done: both checks passed)*
1. JSON emission — passed. A temporary `GET` handler at `app/data/[bookId]/[file]/route.ts` with `force-static` and `generateStaticParams` (`file` ending in `.json`) wrote `out/data/en/index.json` and `contents.json` with the correct params in a minimal export project, and `pnpm dev` served the same URLs as `application/json`. In dev a param outside `generateStaticParams` returns a 500, hence the per-book handler split in step 5.
2. History — passed on the built export (`pnpm start`) and on `pnpm dev`, using headless Chrome. On a song page, `history.pushState(null, '', '/en/contents/')` changed the URL while the song stayed mounted (page-level JS marker kept, no document, `.txt` or RSC request). Back and forward moved the URL with no request and no reload. After the `pushState`, pressing `l` made `useGlobalHotkeys` call `router.push('/en/')`, so `usePathname` had updated; that call is Next's own router and did fetch `/en/index.txt?_rsc=…` in the build (and `/en/?_rsc=…` in dev), without a reload. This is the navigation step 15 replaces.

*Phase 1 — Page-data contract and JSON emission (done, no UI change)*

Files: [types/pageData.ts](types/pageData.ts), [other/router/routes.ts](other/router/routes.ts), [other/router/buildId.ts](other/router/buildId.ts), [lib/pageData/loaders.ts](lib/pageData/loaders.ts), [lib/pageData/index.ts](lib/pageData/index.ts), and the two handlers under [app/data](app/data). The authors page now reads its groups from `getAuthorsData`; its built HTML is unchanged (only the build-specific flight lines differ).

3. Add types/pageData.ts with `TRoute` and a `TPageData` envelope `{ build, route, head, data }`, discriminated by kind: book-list, contents, a-z, authors, search, audio, audio-singer, song, page.
4. Add lib/pageData/ with one loader per kind plus `loadPageData(route)` and `listRoutes(bookId)`. Loaders reuse the existing lib functions, stay React-free like `handler.ts`, and absorb all server-only work:
   - `hasBookAudio` becomes `data.hasAudio`.
   - Song data carries `descriptions`, `telegraphUrl` and `nav`.
   - Page data carries pre-rendered `bodyHtml`, so `marked` stays out of the client bundle.
   - The authors `byFirstLine`/unknown split moves out of [app/[bookId]/authors/page.tsx](app/%5BbookId%5D/authors/page.tsx).
   - `head` (title, description, canonical) comes from the existing builders in other/metadata.
5. Data URL scheme, shared by server and client in other/router/routes.ts:
   - `/data/<bookId>/index.json` for the book root, `/data/<bookId>/<root-page-or-slug>.json` for root pages and items, `/data/<bookId>/audio/index.json` for the audio index and `/data/<bookId>/audio/<singerId>.json` for singers.
   - Two handlers split by cost instead of one catch-all, so dev requests stay cheap: `app/data/[bookId]/[file]/route.ts` (root pages and items; listing its params needs only `contents.json`) and `app/data/[bookId]/audio/[file]/route.ts` (audio index and singers; scans song files like today's singer page, so the audio index lives here too).
   - `build` in the envelope is `getBuildId()` (`<commit>@<builtTime>`): songbook sources are fetched at build time, so the commit alone can stay the same while the data changes.
6. Measured on the full build (`pnpm run build:local`, 1351 files, one per route): per-book totals below. Verdict: a bundle per book is cheap enough to precache, so Phase 5 needs no split.

   | Book | Files | Raw KB | Bundle gzip KB | Bundle brotli KB |
   |---|---|---|---|---|
   | en | 215 | 1558 | 332 | 206 |
   | en-2022 | 189 | 1592 | 306 | 188 |
   | en-pe | 103 | 764 | 119 | 73 |
   | es | 168 | 2975 | 580 | 371 |
   | lv | 111 | 890 | 154 | 97 |
   | pt | 134 | 1363 | 238 | 152 |
   | ru | 200 | 2264 | 398 | 221 |
   | ru-kdm | 42 | 332 | 37 | 26 |
   | ua | 189 | 1755 | 268 | 146 |

   Per-page sizes for `en` (raw / gzip): song 3.5 / 1.7 KB, contents 64 / 12.8 KB, a-z 69 / 13.2 KB, authors 56 / 12.2 KB, search 21 / 6.9 KB, audio index 107 / 12 KB. The largest single file in every book is the audio index (up to 246 KB raw, 18 KB gzip). The file count (1351) exceeds the sitemap's 1138 URLs because the sitemap leaves out hidden books and the search pages.

*Phase 2 — Isomorphic views and persistent shell (done; still full reloads)*

Done as planned, with these specifics:
- `Layout` = `DocumentHead` + `LayoutChrome`; analyze and the 404 page still use `Layout`; export uses neither.
- Views live in [components/app/views](components/app/views); songs and pages reuse `SongBody` / `PageBody` as their views. [registry.ts](components/app/views/registry.ts) has `renderView` and `getChrome`. The old `components/content/registry.tsx` and `TContentBodyProps` are removed.
- Views receive `{ page, extras }`; `extras` (the server-rendered JSON-LD) is placed where the route used to render it, so the HTML is unchanged. `AppRoot` is still prop-driven; its state (current page) arrives with Phase 3.
- `TPageData` routes are now narrowed per kind (e.g. a song's `route.slug`).

Results (full build vs the Phase 1 commit):
- Rendered HTML of every page kind is identical once scripts are stripped; only the Next flight payload differs.
- Screenshots of 12 pages × desktop/mobile × 3 scroll positions: 0 of 72 differ.
- No console errors or hydration warnings on any page kind, in the build and in `pnpm dev`.
- Reader pages: HTML is smaller (contents 331 → 208 KB, authors 357 → 185 KB raw); JS +25 KB gzip (181 → 207) and CSS 6–14 → 18 KB gzip, because every view now ships in one chunk. Export, analyze and 404 are unchanged.

7. Split `Layout.tsx` into `DocumentHead` and a client-safe `LayoutChrome`. `Layout` keeps working for analyze, NotFound and test pages.
8. Add components/app/views/ with one view per kind, rendering what each `page.tsx` renders inside `Layout` today, from page data only.
   - A registry (same pattern as `registry.tsx`) maps kind to view plus chrome props: main class, footer page, analytics ids.
   - Remove `Layout` from `ContentShell.tsx`.
   - `SongBody.tsx`, `PageBody.tsx`, `Contents.tsx` and `AZ.tsx` take data props instead of calling lib.
   - Move route-level SCSS imports (ContentPage.scss, SearchPage.scss) into the views.
9. Add `AppDocument` (server: html/head/body) and `AppRoot` (client: holds the current page data, renders `LayoutChrome` plus the view keyed by pathname).
   - Route `page.tsx` files become thin: `loadPageData`, then `notFound()` or `AppDocument`.
   - `generateMetadata` and `generateStaticParams` are unchanged.
   - JSON-LD stays server-rendered and is shown only while the current route is the initial one.
10. Guard: analyze, export and `global-not-found.tsx` must not import `AppRoot` or the views, or their stylesheets leak into the export document.

*Phase 3 — Client router (done)*

Code: [other/router](other/router) (`parsePath` in routes.ts, `pageStore.ts`, `navigate.ts`, `location.ts` with `useAppLocation` / `notifyLocationChange`, `head.ts`, `useAppRouter.ts`) and [AppRoot.tsx](components/app/AppRoot.tsx). Specifics:
- History entries carry our `__kirtanKey`; Next's patched `pushState` adds its own keys and keeps `usePathname` in sync. Scroll positions are remembered per key.
- History, head and scroll are applied in a layout effect after the new view commits, so the URL, footer and view change in one frame.
- The loading indicator is a 3px top bar after 150 ms (`AppRoot.scss`), not the full-screen `Loader` splash.
- `trackPage` now sends an explicit `page_view` on every call after the first. **Turn off "Page changes based on browser history events" in GA4 enhanced measurement**, or client navigations count twice.
- Hreflang and Open Graph tags in the head are not updated on client navigation (crawlers never navigate client-side).

Results (headless Chrome on the build; same scenarios on `pnpm dev`; no console errors):
- Footer link, content link, hotkeys `i`/`c`/`b`, ArrowRight, search auto-navigation, author link with `#section-…`, and switching to another songbook all render without a document load; the only requests are `/data/` JSON (none when cached). Title, canonical and `<html lang>` follow the page.
- Back/forward render without requests and restore scroll (2000 → 2000 on contents).
- `?p=` on the same path changes the URL and footer search link with no request.
- Missing page → JSON 404 → full load → static 404. Hotkey `a` (analyze) → full load.
- Prev/next of a song are prefetched 1 s after it renders (prod only).
- In `pnpm dev` every navigation, including back/forward, refetches its JSON (no cache, no prefetch).

11. Add other/router/ with:
    - `parsePath` — returns null for analyze, export, test, home, `.html` and unknown paths.
    - A page-data store with memory cache, in-flight dedupe and prefetch (cache and prefetch off in development).
    - A module-level `navigate(href)` that falls back to `location.assign` when no `AppRoot` is mounted or the route is null.
    - A `useAppLocation` hook.
12. `AppRoot` intercepts clicks on same-origin `<a href>` through one delegated listener, so existing plain anchors and `paths.ts` stay untouched. It skips modifier keys, `target`, `download`, same-path hash links and non-SPA routes.
    - Navigate: fetch JSON, `pushState`, render in a transition, scroll `.Layout__content` to top or to the `#hash` target.
    - `popstate`: render from cache and restore the saved scroll position.
    - Show the existing Loader after a short delay.
13. Failure policy: on fetch error, 404, or `envelope.build` differing from `getBuildId()` of the running app, do a real document load. That is what keeps the static 404 working and picks up new deploys.
14. Sync `document.title`, meta description, canonical and `<html lang>` on navigation.
15. Convert programmatic navigation to `navigate()` in `useGlobalHotkeys.ts` (also `usePathname` to `useAppLocation`), `SwipeNav.tsx` and `SearchModule.tsx`. PrefRedirect and `NotFound.tsx` stay as is.
16. Make persistent UI react to location: the active state in `FooterItem.tsx`, `usePageQuery.ts` (a `?p=` change on the same song must not refetch), and the Header/Footer `bookId`.
17. Analytics: send an explicit `page_view` on every client navigation after the first, because `trackPage` in `analytics.ts` only sends one on its first call. Check GA4 enhanced-measurement history tracking to avoid double counts.
18. Prefetch JSON on link `pointerenter`/`touchstart`, and the prev/next items of the current song on idle.

*Phase 4 — Player survives navigation (done)*

Done as planned:
- One `PlayerDock` in `AppRoot` (outside the views).
- `autoAdvance` is a `PlayerWidget` prop stored on the controller (`AudioList` passes `false`).
- `PlayerManager` keeps an explicit queue: the live DOM order while the active widget is on the page, frozen when that page is left. The frozen players stay alive and are destroyed when the dock closes or a player from another page starts.
- `usePlayer` asks `playerManager.acquire(key)` for a kept-alive player before creating one. The key is the page path from `PagePathContext` plus the source URL; the context is needed because the new view renders before the URL changes.
- The dock title scrolls to the inline player, or navigates to its page first and scrolls once the widget is back.
- `PlayerSyncToggle` follows only an active player whose widget is on the shown page.

Results (headless Chrome, real SoundCloud audio, no console errors):
- Song → Contents: playback continues and media session stays `playing`.
- Dock Next from Contents plays the song's second recording.
- Dock title returns to the song with the playing widget rebound and scrolled into view.
- Another song: header toggle idle → play starts that song's track.
- X closes the dock.
- Singer playlist → Contents → track ends → next playlist track plays. The dock title then leads back to the playlist with that track's widget active.
- Every page kind still has exactly one dock (analyze and 404 none), and the test player page keeps its own.

**Known issue (existing, now more visible):** every SoundCloud track switch (`widget.load`) adds a history entry inside the hidden iframe. Browser Back then first steps back inside the iframe, so one Back press looks like it does nothing. It used to happen only on the page where the switch occurred.

19. Render a single `PlayerDock` in `AppRoot` and remove it from `AudioList.tsx` and `Playlist.tsx`; the test playground keeps its own. The `has-player-dock` / `--player-dock-height` contract is unchanged.
20. Make `autoAdvance` per-controller (AudioList false, Playlist true, passed through `PlayerWidget`) instead of the global flag the dock sets today.
21. Add a queue to `PlayerManager.ts`.
    - While the active controller's element is connected, the queue is the connected controllers in DOM order, as today.
    - When the origin view unmounts, the queue freezes: its controllers are retained detached instead of destroyed, and prev/next/`handleEnded` use the queue index.
    - The queue is released on dock close or when a track from another page starts.
22. `usePlayer.ts` acquires controllers from the manager by key (origin path plus source URL), so returning to the origin page rebinds widgets to the live controllers. Unmount destroys only controllers outside the retained queue; the microtask-deferred teardown stays.
23. The controller stores `originHref`. The dock title scrolls to the inline widget if it is connected; otherwise it calls `navigate(originHref)` and then scrolls.
24. `PlayerSyncToggle.tsx` binds to the active controller only if it belongs to the current page; otherwise it calls `playFirst()` for this page.

*Phase 5 — Offline songbook precache (done)*

Done as planned, with these specifics:
- **Bundle:** at `/data/<bookId>/bundle.json`, not `_bundle.json`, because Next ignores app folders that start with `_`. Handler: [app/data/[bookId]/bundle.json/route.ts](app/data/%5BbookId%5D/bundle.json/route.ts); `loadBookBundle` lives in lib/pageData.
- **Shell:** [app/shell/page.tsx](app/shell/page.tsx) renders `AppDocument` with `page={null}`. `useAppRouter` then loads the data for the current URL, or shows an offline message. Next keeps the real URL (no rewrite to `/shell/`).
- **[other/router/precache.ts](other/router/precache.ts):** `usePrecacheBook` in `AppRoot` asks the service worker to precache on idle, once per book per build. It sets a localStorage marker after the worker confirms, and skips dev and Save-Data.
- **Cache per build:** the worker is registered with `?v=<getBuildId()>` instead of the commit, so a data-only rebuild gets a fresh cache.
- **[public/sw.js](public/sw.js):** `/data/` is cache-first (network-first on localhost). `PRECACHE_BOOK` unpacks the bundle under each page's data URL and caches the shell plus the JS/CSS it loads. An offline navigation falls back to cached HTML, then the shell, then the old offline page.
- `robots.txt` disallows `/data/` and `/shell/`.

Results (build with the service worker enabled, headless Chrome, server stopped for the offline part, no exceptions):
- Precache of `en`: 215 data files + shell + 21 assets in one cache.
- Offline client navigation to an unvisited song and to a singer playlist works.
- Offline reload of an unvisited song is served by the shell and renders the song with its title.
- Client navigation from the shell page works.
- Offline reload of a visited page uses its cached HTML.
- A book that was not precached (`ru`) shows the offline message.
- Registering a newer worker version deletes the old cache.
- In `pnpm dev`, `/shell/` and `/data/en/bundle.json` respond (the worker stays off there via `.env.local`).

25. Emit `/data/<bookId>/bundle.json` as `{ build, pages: { dataUrl: envelope } }` covering all SPA routes of the book, from its own handler `app/data/[bookId]/bundle.json/route.ts` (not `_bundle.json`: Next ignores app folders starting with `_`). Decision gate from step 6 is resolved: the largest bundle is 580 KB gzip (371 KB brotli), so no split.
26. Add an app shell route `/shell/` (noindex, not in the sitemap): `AppDocument` with no initial data, and `AppRoot` loads the JSON for the current location on mount. Verify that Next hydrates cleanly when the shell is served under another URL.
27. In `sw.js`:
    - Serve `/data/` JSON cache-first from the versioned cache (network-first on localhost).
    - On a `PRECACHE_BOOK` message, fetch the bundle, unpack each entry under its data URL and cache the shell.
    - Offline navigation falls back to cached HTML, then the shell, then the existing offline page.
28. Trigger the precache on idle after first render for the current book, once per build, and skip it on Save-Data.
29. Add `Disallow` for `/data/` and `/shell/` in `robots.ts`.

*Phase 6 — Docs (done)*

30. Update the affected instruction files (paths, global-hotkeys, song-navigation, player-widget, song-audio-player, audio-pages, pages), add one for the router and page-data contract, and update the section in `todo.md`.
    - Result: new `.github/instructions/app-architecture.instructions.md` (concept: one loader → HTML + JSON, page-data envelope, AppRoot/router, persistent player and analytics, offline, dev mode, rules) and `.github/instructions/app-routes.instructions.md` (registry of every app and full-load route with its files, plus recipes for a root page, a parametrized page, a content item type and a full-load page).
    - Updated: pages, player-widget, song-audio-player, song-navigation, audio-pages, paths, global-hotkeys, analyze-songbooks, songbook-export.

**Dev rules (keep `pnpm dev` fast and fresh)**
- The page-data memory cache and prefetch are off in development, so every navigation reads fresh source data.
- The service worker must not serve `/data/` cache-first in dev: its cache name is the git commit, which does not change between edits. Keep it unregistered via `NEXT_PUBLIC_PREVENT_SERVICE_WORKER` or use network-first on localhost.
- Router listeners must be idempotent under StrictMode double effects.
- Expected dev-only effect: editing a loader after a client navigation makes Next refetch the current URL and remount `AppRoot`. Content is correct; view state and the player reset.

**Verification**
1. Every phase: `pnpm run type-check`, `pnpm run lint`, `pnpm run build:local`, then `pnpm start`. In `pnpm dev`, edit a song JSON and a view component: navigation shows the new data without a restart, and Fast Refresh keeps view state.
2. Phase 1 (done): `out/data` has one JSON per route (1351 files, matching the route table); sizes recorded in step 6.
3. Phase 2:
   - Built HTML for a sample URL of every kind still contains full content, title, canonical, hreflang and JSON-LD.
   - Main-content markup diff against the pre-change build is empty or explained.
   - Export output is byte-identical after normalising `/_next/static` URLs and the build id.
   - First Load JS is compared before and after.
4. Phase 3:
   - The network panel shows only `/data/` JSON requests on navigation (no document, no `.txt`).
   - Back/forward, `?p=` links, `#section` links, hotkeys, swipe and search auto-navigation all work.
   - An unknown URL lands on the static 404, and a legacy `/<bookId>/<slug>.html` still redirects.
   - Analyze and export open as full loads.
5. Phase 4:
   - Play on a song, then navigate to contents, another song and another songbook: audio continues and prev/next follow the origin queue.
   - A singer playlist keeps auto-advancing after leaving the page.
   - Returning to the origin page shows the active widget, and X releases the queue.
   - Real SoundCloud audio needs system Chrome or your own check.
6. Phase 5: after precache, go offline and browse the whole book, including a reload on an unvisited song; a new deploy replaces the cache.

**Further considerations**
1. Unused RSC `.txt` payloads stay in `out`. Deleting them in postbuild is possible; I deferred it to keep risk low.
2. All views ship in one client chunk. Lazy-load heavy views only if First Load JS regresses.
3. The precache trigger is automatic on idle in this plan. The alternative is an explicit "Download for offline" button, which avoids unrequested data use but needs UI.
