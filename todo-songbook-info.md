
The songbook info flows like this: `createSongbookInfo()` in `scripts/songbookInfo.js` merges each book package's `songbook.json`, its settings from `source/songbooks.json` (`shortcuts`, `audio`; not `repository`) and `songsCount` into one object. `processSrc.js` writes all of them into `source/books/songbooks.json`. The app reads that file through `getBooksMap()` in `lib/books.ts`.

## Fields that are used

| Field | Where it's used |
|---|---|
| `title` | `BookDescription.tsx:15` on the contents, a-z, authors and search pages; `BookCard.tsx:26` on home; `SongBookItem.tsx:37` for other translations and 404; `bookTitle` in `SongBody.tsx:39` and `PageBody.tsx:14`; `export.ts:83`; the song meta description in `meta.ts:36`; the fallback page title in `getPageMeta.ts:34` |
| `title_full_short` | Only `getPageMeta.ts:34`, where it overrides `title` in the page `<title>` |
| `subtitle` | `BookDescription.tsx:15`, `BookCard.tsx:26`, `SongBookItem.tsx:41` |
| `slug` | Links and thumbnails in BookDescription, BookCard, `SongbookList.tsx:20`, SongBookItem and NotFound; also hreflang/locale in `getAlt.ts:24` and `LdJsonSong.tsx:46-47` |
| `hidden` | `useHiddenBooks` in `BookCard.tsx:27` and `SongBookItem.tsx:21`; filtering in `analyze.ts:53` |
| `sort_order` | Sorting in `BookList.tsx:29-30`, `song.ts:124-125` for other translations, and `analyze.ts:57` |
| `songsCount` | Added by the build script, not taken from `songbook.json`. Shown in `BookCard.tsx:26` |

The validation schema in `validationSchema.js:549` requires `slug`, `songsCount`, `subtitle` and `title`, and allows extra fields.

## Fields that are present but never read

- **`language`** (in `ua`, `pt`, `en-pe` and `ru-kdm`): the locale comes from the slug instead, via `getBookLocale()` / `getBookLangLabel()` in `helpers.ts:14-24` and `bookId.slice(0, 2)` in the LD-JSON files. So `pt` gets `pt`, not `pt-BR`. `ua` → `uk` is hardcoded.
- **`render`** (all keys, e.g. `tg.contents.first_line`, `tg.a-z.title.words`, `tg.contents.page_number`): nothing in the app reads them. The `tg.` prefix suggests they were meant for Telegraph output.

## Issues found

- ✅ **`sort_order` handling:** all sorts now use `compareBooks()` in `scripts/compareHelpers.js` (books without `sort_order` go last).
- ✅ **Type mismatch:** `TBookDescription` now has `hidden`/`sort_order` optional and declares `language`, `render`, `shortcuts`, `audio`.
