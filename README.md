# Kirtan Next

Static site generator for the [Kirtan Site](https://kirtan.site) songbook, version `^2.0.0`. Built on top of the [Next.js](https://nextjs.org) SSG.

## Goal

Deliver a better and more future-proof user experience with a modern front-end stack, and adopt a modern way of building front-end projects to simplify development, debugging, and maintenance.

## Project structure

Follows the standard Next.js layout (App Router). The additions are:

- `./source` — inputs consumed by the build pipeline. Two files are committed as the source of truth:
  - `songbooks.json` — `slug → git repo URL` map of songbook packages.
  - `resources.json` — `slug → git repo URL` for the shared resources package (audio metadata, persons).
  - `translations.json` — site i18n strings.

  The following files under `./source` are **generated / fetched** at build time (do not edit manually):
  - `telegraph-pages.json` — fetched from [`scsm-ua/kirtan-mate`](https://github.com/scsm-ua/kirtan-mate/blob/main/data/telegraph-pages.json) by `install:fetch`.
  - `books/` — populated by `install:post-fetch` (see below). Gitignored.

- `./shared` — working directory for git-based songbook + resources packages. A `package.json` is generated from `songbooks.json` + `resources.json` and installed with a single `pnpm install` pass. Gitignored, refreshed from zero on every deploy.

- `./scripts` — build-time scripts:
  - `shared/installShared.js` — writes `./shared/package.json` and runs `pnpm install` there.
  - `shared/fetchTelegraphPages.js` — downloads `telegraph-pages.json`.
  - `shared/copySongbook.js` — builds a songbook package inside `./shared/node_modules/<slug>` and copies the resulting jsons into `./source/books/<slug>/`.
  - `shared/prepareSharedResources.js` — reads the installed shared-resources package and writes `./source/books/resources.json`.
  - `processSrc.js` — iterates `songbooks.json`, invokes `copySongbook` + generates helper files.
  - `validate.js`, `validation/` — schema validation of songbooks and translations.
  - `postbuild.js` — writes `.nojekyll` into `out/` after `next build`.

Each songbook folder under `./source/books/<slug>/` gets these generated helper files:
- `a-z.json` — alphabetical song index.
- `authors.json` — songs grouped by author.
- `contents.json` — songs grouped by section.

`./source/books/songbooks.json` holds the aggregated summary of all songbooks (title, subtitle, song counts, etc.).

## Build pipeline

The build runs in two phases so that local debug can rebuild songbooks without a full re-download, and deployments can always fetch the latest git versions.

**Phase 1 — `install:fetch` (network):**
1. Write `./shared/package.json` from `source/songbooks.json` + `source/resources.json` (each dependency installed under its slug as a pnpm alias).
2. `pnpm install` inside `./shared`.
3. Download `source/telegraph-pages.json` from `scsm-ua/kirtan-mate`.

**Phase 2 — `install:post-fetch` (local, no network):**
For each songbook slug in `source/songbooks.json`:
1. `pnpm run build` inside `./shared/node_modules/<slug>` (so local edits to a linked package are always picked up).
2. Copy the built `json/` files into `./source/books/<slug>/`.
3. Generate `a-z.json`, `authors.json`, `contents.json`.

Then the shared resources package is transformed and written to `./source/books/resources.json`, and the aggregated `songbooks.json` summary is written.

**Then `validation` → `next build`.**

Full sequence: `install:fetch` → `install:post-fetch` → `validation` → `next build`. Wrapped by the `build:all` script.

## Scripts

| Script | Description |
| --- | --- |
| `dev` | Start the Next.js dev server on port `3333`. |
| `build` | Low-level `next build` only (no data prep, no env loading). |
| `build:prod` | `env/.env.prod` + `build`. Local production build. |
| `build:test` | `env/.env.dev` + `build`. Local dev-env build. |
| `build:all` | Full pipeline: `install:fetch` → `install:post-fetch` → `validation` → `next build`. |
| `start` | Serve the exported `./out` folder on port `3334`. |
| `postbuild` | Writes `.nojekyll` into `./out` (runs automatically after `build`). |
| `install:fetch` | Phase 1. Installs all songbook + resources git packages into `./shared` and fetches `telegraph-pages.json`. |
| `install:post-fetch` | Phase 2. Builds each songbook package in `./shared` and copies + processes the jsons into `./source/books/`. |
| `validation` | Validate the generated songbooks and `translations.json` against JSON schemas. Requires `install:post-fetch` to have run first. |
| `lint` | ESLint. |
| `type-check` | `tsc --noEmit`. |

## Local setup

```sh
pnpm install
pnpm run install:fetch       # phase 1 — needs network
pnpm run install:post-fetch  # phase 2 — no network needed
pnpm run dev
```

Re-run `install:post-fetch` after editing a locally linked songbook package to pick up your changes without a re-fetch.

## Debug local songbooks

Link local checkouts of songbook repos into `./shared` (where phase 1 installed them). All commands must be run from inside `./shared`, not from the project root:

```sh
cd shared

pnpm link ../../gaudiya-gitanjali-lv
pnpm link ../../gaudiya-gitanjali-ru
pnpm link ../../gaudiya-gitanjali-ua
pnpm link ../../kirtan-guide-en
pnpm link ../../kirtan-guide-es
pnpm link ../../kirtan-guide-pt
pnpm link ../../kirtan-guide-pocket-edition
```

> Paths are `../../<repo>` because `./shared` is one level below the project root and the sibling songbook checkouts are assumed to live next to the project root.

After linking, re-run only phase 2 to rebuild + copy from the linked packages:

```sh
pnpm run install:post-fetch
```

To unlink and go back to the fetched git versions, re-run phase 1:

```sh
pnpm run install:fetch
```

## Environment variables

All runtime config is exposed via `NEXT_PUBLIC_*` variables, consumed by the Next.js build. Locally they are loaded from `env/.env.dev` / `env/.env.prod` via `env-cmd` (see `build:test` / `build:prod`). In CI they are injected directly by the workflow (see below).

| Variable | Required by | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_ENV` | build | `development` or `production` — toggles env-specific behavior. |
| `NEXT_PUBLIC_ORIGIN` | build | Canonical site origin, e.g. `https://kirtan.site/`. Used for sitemap / metadata / share URLs. |
| `NEXT_PUBLIC_G_ID` | build (prod) | Google Analytics measurement ID. |
| `NEXT_PUBLIC_SEARCH_ACCOUNT_ID` | build | Search provider account ID. |
| `NEXT_PUBLIC_SEARCH_API_KEY` | build | Search provider API key. |

Example [env/.env.prod](env/.env.prod):
```
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_ORIGIN=https://kirtan.site/
NEXT_PUBLIC_G_ID="G_ID"
NEXT_PUBLIC_SEARCH_ACCOUNT_ID="SEARCH_ACCOUNT_ID"
NEXT_PUBLIC_SEARCH_API_KEY="SEARCH_API_KEY"
```

## Deployment (GitHub Actions)

> For the initial GitHub Pages / secrets / token setup steps in the GitHub UI, see [PAGES-DEPLOY.md](PAGES-DEPLOY.md).

The [.github/workflows/build_and_deploy.yml](.github/workflows/build_and_deploy.yml) workflow is triggered manually (`workflow_dispatch`) and does:

1. Checkout the repo.
2. Install pnpm (`pnpm/action-setup@v4`).
3. Set up Node.js (v23) with `cache: 'pnpm'` (root `pnpm-lock.yaml`).
4. `pnpm install --frozen-lockfile` — root dependencies.
5. `pnpm run install:fetch` — phase 1 (also refreshes `telegraph-pages.json` and all songbook packages from their git repos).
6. `pnpm run install:post-fetch` — phase 2 (build + copy jsons).
7. `pnpm run validation`.
8. `pnpm run build` — with `NEXT_PUBLIC_*` env vars injected from GitHub Actions **repository variables** (see below).
9. Deploy `./out` to the `gh-pages` branch via `JamesIves/github-pages-deploy-action@v4`.

### Required GitHub Actions configuration

Managed under repo Settings → **Secrets and variables → Actions**.

**Repository variables** (Variables tab — plain, non-sensitive values):
- `NEXT_PUBLIC_ENV`
- `NEXT_PUBLIC_ORIGIN`
- `NEXT_PUBLIC_G_ID`
- `NEXT_PUBLIC_SEARCH_ACCOUNT_ID`
- `NEXT_PUBLIC_SEARCH_API_KEY`

**Repository secrets** (Secrets tab):
- `GH_TOKEN` — a personal access token (or fine-grained token) with `contents: write` on this repo, used by the deploy action to push the built site to the `gh-pages` branch.

> The `env/.env.*` files are **not** used by CI — the workflow injects env vars directly, so CI values are controlled entirely through the GitHub UI.
