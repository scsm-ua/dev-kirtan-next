## Plan: Single songbook info object

Today the info about one songbook comes from two sources through different functions:

| Source | Holds | Read by |
|---|---|---|
| `<book package>/songbook.json` | `title`, `subtitle`, `slug`, `sort_order`, `hidden`, `title_full_short`, `language`, `render` | `copySongbook.js` → generated `source/books/songbooks.json` → `getBooksMap()` in `lib/books.ts` |
| `source/songbooks.json` (site settings) | `repository`, `shortcuts`, `audio.filter.by_title` | `scripts/songbookSettings.js`: `getSongbookRepositories`, `getAudioTitleFilter`, `getSongbookShortcuts` — the last one is imported by app code in `lib/pageData/loaders.ts` |
| computed | `songsCount` | `addSongsCount.js` mutates the map |

Goal: the build merges all three into **one object per book** in the generated `source/books/songbooks.json`. One function builds it (`scripts/songbookInfo.js`), one module reads it (`lib/books.ts`). App code no longer imports from `scripts/`.

Merged object for `en` after the change:

```json
{
  "title": "Kirtan Guide",
  "title_full_short": "Kīrtan Guide 12th Ed",
  "subtitle": "London, Twelfth Edition, 2026",
  "slug": "en",
  "sort_order": 10,
  "shortcuts": [{ "icon": "clock", "title": "The Daily Programme", "slug": "003-programme" }],
  "audio": { "filter": { "by_title": ["…"] } },
  "songsCount": 194
}
```

**Steps**

*Phase 1 — build: one builder* (blocks everything)
1. New `scripts/songbookInfo.js`, replacing `scripts/songbookSettings.js` and `scripts/addSongsCount.js` (both deleted):
   - `getSongbookRepositories()` — moved as is; still needed by `installShared.js` before the packages exist.
   - `createSongbookInfo(bookSlug)` — returns `{ ...<package>/songbook.json, ...settings without repository, songsCount }`. The string shorthand (`"lv": "git+https://…"`) is normalized here, privately. The song count logic moves in from `addSongsCount.js` unchanged.
   - Nothing else is exported: `getSongbookSettings`, `getAudioTitleFilter` and `getSongbookShortcuts` go away.
2. `scripts/shared/copySongbook.js`: drop the `booksMap` parameter and the `require(... BOOK_INFO)` line; it only builds and copies.
3. `scripts/processSrc.js`: inside the loop, after `copySongbook`, do `const info = booksMap[bookSlug] = createSongbookInfo(bookSlug)` and pass `audioTitleFilter: info.audio?.filter?.by_title || null` to `transformContents`. Remove the `addSongsCount` and `getAudioTitleFilter` imports. Order still matters: copy first, because the count reads the copied songs.
4. `scripts/shared/installShared.js`: change the import path to `../songbookInfo`.

*Phase 2 — types and validation* (*parallel with 1*)
5. `types/book.ts`, `TBookDescription` (name kept, see Decisions):
   - add `shortcuts?: Array<TShortcut>` and `audio?: { filter?: { by_title?: Array<string> } }`;
   - add the fields that exist in the data but are missing from the type: `language?: string`, `render?: Record<string, boolean | number>`;
   - make `hidden` and `sort_order` optional, as they are in the data. Fix whatever the compiler then reports (expected: `lib/analyze.ts` sort, see step 9).
6. `scripts/validation/validationSchema.js`, `SONGBOOKS_VALIDATION_SCHEMA`: add optional `shortcuts` (array of `{ icon, slug, title }`, all required), `audio`, `sort_order` (number), `hidden` (boolean). Keep `additionalProperties: true`.

*Phase 3 — app: one reader* (*depends on 1, 5*)
7. `lib/pageData/loaders.ts`: remove the `@/scripts/songbookSettings` import, the local `getShortcuts` helper and the `shortcuts:` lines in the `contents` and `a-z` cases.
8. `types/pageData.ts`: remove `shortcuts` from `TIndexData`. `components/app/views/ContentsView.tsx` and `AZView.tsx` pass `shortcuts={book.shortcuts ?? []}`. `Contents`, `AZ` and `IndexExtraLinks` stay unchanged.
9. `lib/books.ts` stays the only reader. Add `compareBooks(a, b)` that sorts by `sort_order` with the `Number.MAX_SAFE_INTEGER` fallback, and use it in `lib/analyze.ts`, `lib/song.ts` and `components/home/BookList/BookList.tsx`. This also fixes the `NaN` sort for `ru-kdm` (no `sort_order`) on the analyze page. `scripts/createAllSongs.js` has the same bug; give it the same fallback inline.

*Phase 4 — docs* (*parallel with 3*)
10. `README.md`: update the `songbooks.json` settings paragraph, the scripts list and the "aggregated summary" paragraph to describe the merge. Update the `TShortcut` comment in `types/book.ts`, the flow paragraph in `todo-songbook-info.md`, and remove the done line from `todo.md`.

**Relevant files**
- `scripts/songbookInfo.js` — new; the only place that knows both sources
- `scripts/songbookSettings.js`, `scripts/addSongsCount.js` — deleted
- `scripts/processSrc.js`, `scripts/shared/copySongbook.js`, `scripts/shared/installShared.js` — call sites
- `lib/books.ts` — the only reader; gains `compareBooks`
- `lib/pageData/loaders.ts`, `types/pageData.ts`, `components/app/views/ContentsView.tsx`, `components/app/views/AZView.tsx` — shortcuts now come from `book`
- `types/book.ts`, `scripts/validation/validationSchema.js` — shape of the merged object
- `scripts/validate.js` — no change; it reads `source/songbooks.json` only for the slug list

**Verification**
1. `pnpm run install:post-fetch` regenerates `source/books/songbooks.json`. Diff against the previous file: the only changes are `shortcuts` and `audio` added under `en`.
2. Diff one `en` song with filtered audio (before/after) to confirm the audio title filter still applies.
3. `pnpm run validation`, `pnpm lint` and `pnpm build` pass.
4. Grep for `songbookSettings|addSongsCount|getSongbookShortcuts|getAudioTitleFilter|@/scripts/` in `app`, `components`, `lib`, `other`, `scripts` returns nothing.
5. Manual: `/en/contents/` and `/en/a-z/` still show "The Daily Programme" shortcut; `/ru/contents/` shows none; `/ru-kdm/analyze/` orders the other books by `sort_order`.

**Decisions**
- On a key conflict the site settings in `source/songbooks.json` win over the package's `songbook.json`, so the site can override a book without a package release. No key conflicts exist today.
- `repository` is not copied into the merged object. It is only needed at install time, and the merged object is sent to the browser inside every page-data file.
- `audio.filter` is copied, although only the build uses it. This keeps the rule simple ("everything except `repository`"). Cost: about 200 bytes in each `en` page-data file. If that is unwanted, strip `audio` in `createSongbookInfo` too and keep the filter as a local variable in `processSrc.js`.
- The type keeps the name `TBookDescription`. Renaming it to `TSongbookInfo` touches many files and changes no behaviour; it can be a separate mechanical commit.
- Both files keep the name `songbooks.json` (`source/` = input settings, `source/books/` = generated result).

**Further Considerations**
1. `language` — the merged object already carries `language` for `ua` (`uk`), `pt` (`pt-BR`), `en-pe`, `ru-kdm`, but the app derives the language from the slug in about ten places (`getBookLocale`, `getBookLangLabel`, `bookId.slice(0, 2)`). Recommend a follow-up: one `getBookLanguage(book)` in `lib/books.ts` that reads `book.language` and falls back to the slug prefix, replacing the hardcoded `ua` → `uk` map. Not part of this plan, because it changes hreflang/OG output (`pt` → `pt-BR`).
2. `render` — the `tg.*` keys are not read by anything. Recommend leaving them in the data and typing them loosely (step 5); remove them from the book packages separately if Telegraph output is gone for good.
