
The songbook info flows like this: each book's `songbook.json` is loaded in `copySongbook.js:37`. `addSongsCount.js:34-37` then adds `songsCount`, and everything is merged into `songbooks.json`. The app reads that file through `getBooksMap()` in `books.ts:12`.

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

- **`sort_order` handling:** `ru-kdm` has no `sort_order`. `analyze.ts:57` subtracts the values directly with no fallback, so it gets `NaN` when `ru-kdm` is the current book. The other two sorts fall back to `Number.MAX_SAFE_INTEGER`.
- **Type mismatch:** `TBookDescription` in `book.ts:2-10` types `hidden` and `sort_order` as required, but the JSON often leaves them out. It also doesn't declare `language` or `render`.
