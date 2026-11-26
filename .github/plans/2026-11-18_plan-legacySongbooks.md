# Legacy Songbooks

## Behavior

- The main songbook list at `/<bookId>/` shows non-hidden, non-legacy books, with the current book first. If the current book is legacy, show it first as an exception, without duplicating it in the rest of the list.
- Add an accessible, keyboard-navigable "Other songbooks" tile to the main list. It opens `/<bookId>/other/` (for example, `/en/other/`), preserving the current book context.
- The other page lists legacy books only, in the existing book sort order. Selecting a book uses the existing card behavior: save the preferred book and open its A-Z page. Returning to that book's root, such as `/en-pe/`, shows it first on the main list.
- Hidden and legacy are independent: hidden books are excluded except for the current book on the main list. The other page and translations popup still exclude hidden books.
- In the song translations popup, place legacy songbooks after non-legacy songbooks, separated by a double separator when both visible groups are present. Preserve the existing order within each group and the current-book indicator.

## Implementation

1. Move ownership of `hidden` to `source/songbooks.json`. Add `hidden: true` for `ru-kdm`; mark `en-2022` and `en-pe` with `legacy: true`, leaving them non-hidden. Convert their repository strings to settings objects while preserving URLs and order. In `scripts/songbookInfo.js`, discard package-provided `hidden` before merging site settings so an inherited `hidden: true` cannot keep `en-2022` hidden; keep other package metadata intact. Add `legacy?: boolean` to `TBookDescription`, document the settings, and validate both boolean fields in the songbook schema.
2. Regenerate the derived book map through the existing source-processing pipeline. Check that `en-2022` and `en-pe` are legacy and not hidden, `ru-kdm` remains hidden, and repository installation and sorting remain unchanged. Do not edit generated data by hand or alter source packages.
3. Update `BookList` and `BookCard` to implement the list rules above, reusing card styling. Provide a distinct other-songbooks tile, with a localized label and an accessible name; include it in `BookListKeyNav` arrow-key navigation. Add the label in every locale in `source/translations.json` and the matching required schema entry.
4. Add `other` as a book-scoped root page using the existing app route recipe: `SONGBOOK_PAGE` and path helpers, route/page-data types, router parsing and data-file mapping, loader and route listing, view registration and chrome, static HTML route, and metadata. Reuse the existing book-list/card presentation and data where practical. Include the page in the book's JSON bundle so client navigation, back/forward, direct loads, and offline navigation behave consistently. Check for item slugs named `other` before reserving the segment.
5. Decide the page's indexing policy consistently with its purpose: use appropriate canonical metadata; if indexed, add it to the sitemap and provide relevant structured data, otherwise use `noindex` and omit it from the sitemap. Update the route and architecture instruction registries to describe the new page.
6. Update `SongbookList` and its styles for the translations popup to partition books by `legacy` and render the double separator between visible groups. Filter hidden entries before grouping so they do not leave a stray separator; retain links, active styling, and popup keyboard navigation.
7. Add or update automated tests for each behavior and regression listed below, following existing test conventions. Update existing tests whose expectations change; do not rely solely on manual verification.
8. Update `.github/instructions/app-routes.instructions.md`, `.github/instructions/app-architecture.instructions.md`, and `.github/instructions/paths.instructions.md` with the new route, data flow, and path constant. Document the site-owned `hidden` and `legacy` settings, visibility rules, and translations-popup ordering in the appropriate existing project documentation or instruction file; keep examples and route registries consistent with the implementation.

## Verification

- Add pipeline tests for settings overriding package metadata, including a package with `hidden: true`, and validate the generated legacy/hidden flags and repository URLs.
- Update book-list tests for filtering, current legacy first and no duplicates, hidden books, tile labeling/link, sort order, keyboard navigation, and saved book choice. Test the other page lists legacy books only, including hidden/legacy combinations.
- Update translations-popup tests for stable group ordering, the double separator, active legacy books, hidden books, groups with no visible entries, and keyboard navigation across the separator.
- Add router, loader, static-route and bundle tests for `other`, including direct load, client navigation, back/forward, and the reserved-slug check. Add an end-to-end flow from `/en/` to the other page, select `en-pe`, then return to `/en-pe/` and confirm it is first.
- Run `node scripts/validate.js`, focused Vitest tests, `pnpm run type-check`, and `pnpm run lint`; build the static site and verify the HTML, JSON, metadata, and bundle outputs. Exercise offline navigation against a static build.
