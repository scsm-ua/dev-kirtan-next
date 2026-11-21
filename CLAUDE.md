# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static site generator for the Kirtan Site songbooks (https://kirtan.site): Next.js App Router, static export, pnpm, Node >= 24. `README.md` is the reference for the build pipeline, env vars, deployment and debugging local songbooks.

## Commands

```sh
# Songbook data — required before dev, tests and builds (source/books/ is generated, gitignored)
pnpm run install:fetch        # phase 1, network: installs songbook git packages into ./shared
pnpm run install:post-fetch   # phase 2, local: builds them, writes source/books/<slug>/*.json
                              # re-run after editing a linked songbook

pnpm run dev                  # http://localhost:3333
pnpm run validation           # JSON-schema check of books + source/translations.json
pnpm run type-check
pnpm run lint

pnpm test                     # Vitest node + jsdom projects (~30 s, no build)
pnpm exec vitest run tests/logic/other/paths.test.ts   # single file
pnpm exec vitest run -t "name of test"                 # by test name
pnpm run test:coverage        # fails below thresholds in vitest.config.mts (only raise them)
pnpm run test:build           # build:test into .test-output/site/, then tests/build checks
pnpm run test:e2e             # Playwright on the existing test build (port 3337) — rebuild first after code changes
```

Run steps 1–2 (static checks + `pnpm test`) while coding; `test:build` / `test:e2e` after changes to routing, the service worker, the player or the build.

## Architecture (big picture)

- **Data pipeline:** `source/songbooks.json` (slug → git repo + per-book settings; key order = site order) → `scripts/` → generated `source/books/<slug>/*.json` and `source/books/songbooks.json`. Never edit generated files under `source/books/` or `source/telegraph-pages.json`. The app reads book info only via `lib/books.ts`.
- **Static HTML + JSON SPA:** `next build` with `output: 'export'`, `trailingSlash: true`. A single React-free loader, `loadPageData(route)` in `lib/pageData/`, produces each page's `TPageData` (`types/pageData.ts`). It is embedded into the prerendered HTML (`app/[bookId]/**/page.tsx` → `AppDocument`) and also written as `/data/<book>/*.json` (`app/data/**/route.ts`) plus a per-book `bundle.json`. After the first load, the client router (`other/router/`) fetches those JSON files and renders views client-side; the shell and the audio player dock persist across navigations. A service worker (`public/sw.js`) can precache a whole book for offline use, with `/shell/` as fallback.
- **Content items:** songs and markdown pages share route kind `item` and the `[slug]` route, dispatched through the content-handler registry in `lib/content/`.
- **All internal URLs** go through `other/paths.ts`.
- Folder roles: `lib/` build-time data builders, `components/` views, `other/` client/shared modules (router, player, hooks, metadata, i18n), `types/` shared types, `server-worker/` separate feedback worker.

## Feature instructions — read before editing

Detailed docs live in `.github/instructions/` (shared with Copilot). Before changing files that match an `applyTo` glob, read the matching file:

| File | Covers / applies to |
|---|---|
| `app-architecture.instructions.md` | static HTML + JSON nav, router, page data, root page `/`, shell — `components/app/**`, `other/router/**`, `lib/pageData/**`, `types/pageData.ts`, `app/data/**`, `app/shell/**`, `app/page.tsx` |
| `offline-mode.instructions.md` | service worker, book caching, cache status store, offline dot and popup, debugging the cache — `public/sw.js`, `other/offline/**`, `other/router/precache.ts`, `other/connectivity.ts`, `types/offline.ts`, `components/common/CacheStatus/**` |
| `app-routes.instructions.md` | adding/renaming/removing any route or URL — `app/**/page.tsx`, `app/**/route.ts`, `other/router/routes.ts`, `components/app/views/**` |
| `paths.instructions.md` | any internal link/href/canonical/sitemap URL — `other/paths.ts` |
| `pages.instructions.md` | markdown page content type — `components/page/**`, `components/content/**`, `lib/page.ts`, `lib/content/**` |
| `player-widget.instructions.md` | audio player, dock, plugins — `components/player/**`, `other/player/**`, `types/player.ts` |
| `song-audio-player.instructions.md` | player on the song page — `components/song/AudioList/**`, `SongHeader`, `SongBody` |
| `audio-pages.instructions.md` | `/[bookId]/audio` pages — `components/audio/**`, `lib/audio.ts` |
| `learn-mode.instructions.md` | word-by-word Learn mode — `components/song/Verse/**`, `SongText`, `lib/song.ts` |
| `song-navigation.instructions.md` | prev/next + swipe nav — `components/song/PrevNextNav/**` |
| `global-hotkeys.instructions.md` | hotkeys and `kirtan:*` event bus — `other/hooks/useGlobalHotkeys.ts`, `components/common/GlobalHotkeys/**` |
| `songbook-export.instructions.md` | HTML export — `lib/export.ts`, `components/export/**`, `app/[bookId]/export/**` |
| `analyze-songbooks.instructions.md` | analyze page — `lib/analyze.ts`, `components/analyze/**` |
| `translations-schema.instructions.md` | `source/translations.json` + `scripts/validation/validationSchema.js` must stay in sync |

When a change alters behavior described in one of these files, update that file too. Design history and plans: `.github/plans/`.

## Tests

- Tests use the real generated books in `source/books/` (no fixtures); a content change in a book can fail a test.
- All tests live under `tests/<layer>/`, paths mirror the source file (e.g. `other/paths.ts` → `tests/logic/other/paths.test.ts`). Layer = lowest one that can see the behavior: `pipeline` (scripts), `data` (lib, metadata), `logic` (pure functions) run in node; `client` (router, player, hooks) and `ui` (components) run in jsdom; `build` checks built files; `e2e` is Playwright (`*.spec.ts`). The folder decides the environment — never list single files in `vitest.config.mts`.
- Shared helpers only in `tests/helpers/`; inline snapshots only; all generated output goes to `.test-output/`. Full rules: `.github/plans/plan-tests.md`.

## Style

Prettier: 2 spaces, single quotes, semicolons, no trailing commas.
