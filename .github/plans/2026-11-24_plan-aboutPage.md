# Plan: About button on the songbook list

> Status: implemented. Current behaviour: `pages.instructions.md`, "About page".
>
> History: a second version gave each book without an About page its own
> `/<book>/about/` with the `en` text, so the reader's book and language stayed.
> It was built and then dropped: the page is not in the book's contents, so it
> needed its own resolver, hand-added entries in the route list, static params
> and sitemap, a language mark on the text, and seven duplicate English pages
> for search engines. The plan below is the first version again: a plain link
> to `/en/about/`.

## Goal

On the songbook list (`/<book>/` and `/`), the header shows an info button (letter "i" in a circle) directly left of "Feedback". It opens the About page:

1. of the current songbook, if it has one;
2. otherwise of the `en` songbook, if it has one;
3. otherwise the button is not rendered.

No other page shows the button.

## What exists today

- An About page is an ordinary markdown page item: `pages/about.md` in the songbook repo, listed in its `contents.md`. `install:post-fetch` turns it into `source/books/<book>/pages/about.json` and a `contents.json` item with `id: "about"`, `type: "page"`.
- Only `en` has it now (`/en/about/`, title "About Project"). It already has HTML, `/data/en/about.json`, a bundle entry and a sitemap entry. Nothing new is needed on the route side.
- The header is part of the persistent chrome. Its props come from `getChrome(page)` in `components/app/views/registry.ts`, which already special-cases `book-list` (`hideCacheStatus`).

## Decisions

| Question | Decision |
|---|---|
| How is "the About page" identified? | By the fixed slug `about` and `type: 'page'` in the book's `contents.json`. No new setting in `source/songbooks.json`. |
| What does the fallback open? | The real `en` page, `/en/about/`. No copy of the `en` text under `/<book>/about/` (duplicate content, and a page outside the book's contents needs special cases everywhere; see History above). The reader lands in the `en` chrome; the browser Back button returns to their list. |
| Does the fallback change the reader's songbook? | No. `PREFERRED_BOOK_ID` is written only on a click in `BookCard`, so `/` still opens their own book. |
| Where is the choice made? | At build time, in `loadPageData`. The view gets a ready path (rule 1 of `app-architecture.instructions.md`). |
| Button label (`aria-label`, `title`) | The title of the target item from `contents.json` ("About Project"). It is in the language of the page it opens, and no new key in `source/translations.json` is needed. |
| Fallback book id | `DEFAULT_LANGUAGE` from `other/i18n.ts` (`'en'`). |

## Changes

### 1. Slug constant — `other/paths.ts`

```ts
export const ABOUT_PAGE_SLUG = 'about';
```

The path itself is `getSongPath(bookId, ABOUT_PAGE_SLUG)`; no new path helper.

### 2. Resolver — `lib/about.ts` (new)

```ts
/** About page of the book, else of the default-language book, else `null`. */
export function getAboutLink(bookId: string): TAboutLink | null
```

- Tries `[bookId, DEFAULT_LANGUAGE]` in order.
- A book qualifies when it is in `getBooksMap()` and `getContentItemBySlug(id, ABOUT_PAGE_SLUG)` returns an item with `type === ITEM_TYPE.PAGE`. A song with the slug `about` does not count.
- Returns `{ path: getSongPath(id, ABOUT_PAGE_SLUG), title: item.title }`.
- This is the whole module: nothing else in `lib/` knows about the About page.

### 3. Page data — `types/pageData.ts`, `lib/pageData/loaders.ts`

- `types/pageData.ts` defines `TAboutLink = { path: string; title: string }`; `TBookListData` gets `about?: TAboutLink`.
- The `book-list` case sets `about: getAboutLink(bookId) ?? undefined`. The `other` case does not set it.
- `/` needs nothing extra: it uses the first book's `book-list` data, and the root move to another book loads that book's `index.json`, which carries its own `about`.

### 4. Chrome — `registry.ts`, `LayoutChrome.tsx`, `Header.tsx`

- `TLayoutChromeProps` gets `about?: TAboutLink`.
- `getChrome`, case `book-list`: add `about: page.data.about`.
- `LayoutChrome` passes it to `Header`.
- `Header` renders, between `HotkeyHint` and `FeedbackWidget`:

```tsx
{about && (
  <a aria-label={about.title} className="Header__about" href={about.path} title={about.title}>
    <InfoIcon />
  </a>
)}
```

A plain `<a href>` is enough: the router intercepts it, including the cross-book `/en/about/` case.

### 5. Icon and style — `Header.tsx`, `Header.scss`

- Inline SVG (circle + "i"), `currentColor`, `aria-hidden`. No new file in `public/images/svg` (those are cached as shell assets).
- `.Header__about`: 32 × 32 px to match the Feedback button height, white icon, `var(--accent-color)` on hover — the same states as `.FeedbackWidget__button`, plus a focus outline.

### 6. Docs

- `app-architecture.instructions.md`: one line in the `getChrome` bullet (`about` on `book-list`).
- `pages.instructions.md`: section "About page" — the reserved slug `about`, optional per book, fallback to `en`, shown only on the songbook list.
- `paths.instructions.md` (`ABOUT_PAGE_SLUG`), `app-routes.instructions.md` (the slug is reserved), `offline-mode.instructions.md` (header controls on the songbook list), `CLAUDE.md` (table row).

## Tests

| Layer | File | Checks |
|---|---|---|
| `data` | `tests/data/lib/about.test.ts` (new) | For every real book: has its own `about` page → its own path; has none → the `en` path. No About page anywhere → `null`; a song with the slug is not taken (mock `getContentItemBySlug`). |
| `data` | `tests/data/lib/pageData/loaders.test.ts` | For every book, `book-list` data has the expected `about` (path and title computed from `contents.json`); `other` has none. |
| `ui` | `tests/ui/components/common/Header/Header.test.tsx` (new) | With `about`: a link with that `href` and label, placed before the Feedback widget. Without: no link. |
| `ui` | `tests/ui/components/app/AppRoot.test.tsx` | The link is on the songbook list and gone after navigating to `contents`; from a book without an About page it opens the `en` page. |
| `e2e` | `tests/e2e/navigation.spec.ts` | From the list of a book without an About page the button opens the page of another book without a document load; Back returns to the list. |

Tests name no book (`2026-11-16_plan-tests.md`, R1–R2): `tests/helpers/cases.ts` has the finders `own-about` and `about-of-default-book` and the helper `getAboutBookId`.

Also changed: `findTwoSongs` in `tests/e2e/offline.spec.ts` now picks a second song that is not a prev/next neighbour of the first. The router prefetches neighbours 1 s after a page is shown; when that was quicker than the book job, the neighbour's page entry was stored and "no page entry is written" failed. One more e2e test in the run was enough to make it fail every time.

Run: `pnpm run type-check && pnpm run lint && pnpm test`, then `pnpm run test:build && pnpm run test:e2e` (page data and header changed).

## Not changed

- The About page stays a normal content item: it is still listed in Contents ("Intro"), in prev/next, in the export and in the sitemap. Hiding it from those would be a separate task.
- Offline: the songbook list caches no book, so the button works offline only if the target book is already cached. Otherwise the reader gets the "You're offline" note, like for any other uncached link.
- Caching: opening `/en/about/` from another book's list starts caching the `en` book. This is the normal rule, not a special case: the app precaches the book of the page on screen (`usePrecacheBook`), and the worker schedules the book job after any page data it fetched from the network (`afterPageFromNet` in `public/sw.js`). Links to the same song in another book behave the same way. Excluding the About page would need a special case in both places; left as it is.

## Open question

A songbook repo must list `pages/about.md` in its `contents.md`, as `en` does; the site only knows items from `contents.json`. If About pages should exist without a Contents entry, the build (`scripts/transformContents.js`) and `loadItem` need a second lookup path — not part of this plan.
