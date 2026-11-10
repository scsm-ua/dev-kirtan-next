## Plan: All-audios songbook pages (4 routes)

Add four statically generated pages per songbook listing every song recording with the inline player: two grouped by singer (`/[bookId]/audio/a-z/`, `/[bookId]/audio/contents/`) and two grouped by song (`/[bookId]/a-z/audio/`, `/[bookId]/contents/audio/`). Data is derived at build time in a new `lib/audio.ts` (walk contents → read each `has.audio` song JSON → `resources.audio`), reusing `ContentGroup`/`IndexLink`/`Pills` for layout and `PlayerWidget`/`PlayerDock` for playback. No build-script or data-model changes.

**Steps**

*Phase A — foundations (steps 1–5 are parallelizable)*
1. **Paths** — in `paths.ts` add `AUDIO_PAGE = { BY_SINGER_A_Z: 'audio/a-z', BY_SINGER_CONTENTS: 'audio/contents', BY_SONG_A_Z: 'a-z/audio', BY_SONG_CONTENTS: 'contents/audio' }` + `TAudioPage`; widen `TSongbookPage` (or the `page` param of `getSongbookPagePath`) so `getPageMeta`, `getAlt`, `LdJson` accept these nested segments unchanged (they only interpolate `/${bookId}/${page}/`).
2. **Types** — new `types/audio.ts`: `TAudioTrack { url; title? }`, `TAudioEntry { item: TContentItem; label: string; tracks: TAudioTrack[] }`, `TAudioGroup { name?: string; items: TAudioEntry[] }`. One shape serves both page kinds (by-song: label = song, tracks titled by singer; by-singer: label = song, one untitled track).
3. **Data** — new `lib/audio.ts` (model on `analyze.ts` and the `readListData` cache in `contents.ts:48-66`):
   - `getSongAudioMap(bookId)`: for every `type === ITEM_TYPE.SONG && has.audio` item in `getContentsByBookId`, `readFileSync` `source/books/<bookId>/songs/<id>.json`, keep `resources.audio`; memoize per book in production.
   - `hasBookAudio(bookId)` and `getAudioBookIdParamList()` (= `getBookIdParamList().filter(hasBookAudio)`).
   - `getAudioBySong(bookId, 'a-z' | 'contents')`: source groups from `getIndexesByBookId` / `getContentsByBookId`, filter `has.audio`, drop `(hidden)` titles (as `Contents.tsx:31-37` does), dedupe a-z duplicates by `id` (keep first), drop empty groups, attach tracks titled `title[lang] || title.en` (same rule as `AudioList.tsx:22`).
   - `getAudioBySinger(bookId, 'a-z' | 'contents')`: walk contents in book order; group key `title.en`, display localized; singer order = first appearance then stable-move names containing `Dev-Goswami` to the front; items sorted with `compareFirstLines` on `aliasName` (a-z) or `title` (contents); label = `aliasName` (a-z) or `title` (contents).
4. **Translations** — add `AUDIO_PAGE` block to all 6 languages in `translations.json`: `HEAD.DESCRIPTION`, `SCHEMA.NAME`, `SCHEMA.DESCRIPTION`, `LINK_FULL_TITLE` ("All audios"), `BY_SINGER`, `BY_SONG`, `SORT_FIRST_LINES`, `SORT_TITLES`; mirror in `validationSchema.js` (`additionalProperties: false` + `required`).
5. **Metadata** — new `other/metadata/getAudioPageMeta.ts` exporting a factory `createAudioPageMeta(page: TAudioPage)` that returns a `generateMetadata` calling `getPageMeta({ bookId, descriptionKey: 'AUDIO_PAGE.HEAD.DESCRIPTION', page })` (pattern: `getAzPageMeta.ts`).

*Phase B — UI (depends on A)*
6. **ContentGroup** — add optional `renderItem?: (item) => ReactNode` prop to `ContentGroup.tsx` (default stays `ContentItem`), so audio pages inherit header/line styling and `#section-<name>` anchors for `Pills`.
7. **Audio components** — new `components/audio/`:
   - `AudioEntry.tsx` + `AudioEntry.scss` (BEM): row with `<a href={getSongPathWithPage(bookId, item)}>` label + page number, then `<ul>` of `<PlayerWidget source={{ url }} title={track.title} />`.
   - `AudioIndex.tsx`: `<h1>` (`AUDIO_PAGE.BY_SINGER`/`BY_SONG`), two `IndexLink`s at top (grouping toggle by singer ⇄ by song; sort toggle first lines ⇄ titles, both via `getSongbookPagePath(bookId, AUDIO_PAGE.X)`), `Pills` only for the by-song a-z variant, `<ul className="IndexPage__list">` of `ContentGroup` with `renderItem`, and a single `<PlayerDock />`.
8. **Routes** — four thin server pages mirroring [app/[bookId]/a-z/page.tsx](app/[bookId]/a-z/page.tsx): `app/[bookId]/audio/a-z/page.tsx`, `app/[bookId]/audio/contents/page.tsx`, `app/[bookId]/a-z/audio/page.tsx`, `app/[bookId]/contents/audio/page.tsx`. Each: `generateStaticParams = getAudioBookIdParamList`, `generateMetadata = createAudioPageMeta(AUDIO_PAGE.X)`, `Layout` → `BookDescription` → `AudioIndex` → `LdJson pageKey="AUDIO_PAGE" page={AUDIO_PAGE.X}`.
9. **Entry links** (*parallel with 7–8*) — in a-z/page.tsx and contents/page.tsx compute `hasBookAudio(bookId)` and pass `hasAudio` to `AZ.tsx` / `Contents.tsx`; when true render an `IndexLink` "All audios" after the existing top link → `AUDIO_PAGE.BY_SONG_A_Z` / `BY_SONG_CONTENTS`.

**Relevant files**
- `paths.ts` — `SONGBOOK_PAGE`, `TSongbookPage`, `getSongbookPagePath`, `getSongPathWithPage`
- `lib/audio.ts` (new), `types/audio.ts` (new) — reuse `getContentsByBookId`, `getIndexesByBookId`, `ITEM_TYPE`, `compareFirstLines` from `compareHelpers.js`, `PATH.DIR.SONGS`
- `components/audio/AudioIndex.tsx`, `AudioEntry.tsx`, `AudioEntry.scss` (new) — reuse `IndexLink`, `Pills`, `ContentGroup`, `PlayerWidget`, `PlayerDock`, `index-page.scss`
- `ContentGroup.tsx` — `renderItem` prop
- `AZ.tsx`, `Contents.tsx`, their `page.tsx` — "All audios" link
- `other/metadata/getAudioPageMeta.ts` (new) — `getPageMeta` factory
- `translations.json`, `validationSchema.js` — `AUDIO_PAGE` keys
- `app/[bookId]/{audio/a-z,audio/contents,a-z/audio,contents/audio}/page.tsx` (new)

**Verification**
1. `node scripts/validate.js` — translations schema passes for all 6 languages.
2. `pnpm lint` and `pnpm build` — static export emits the 4 pages for every book with audio (e.g. `out/en/a-z/audio/index.html`) and none for books where `hasBookAudio` is false; no type errors from the widened `TSongbookPage`.
3. `pnpm dev`, open `/en/a-z/audio/`: letter groups + Pills scroll to `#section-X`; each song links to its page; players are titled by singer; playing one then letting it end auto-advances to the next; dock appears at bottom and `Layout__content` gets bottom padding; only songs with audio listed, no duplicate songs.
4. `/en/audio/a-z/` and `/en/audio/contents/`: Dev-Goswami singers first; songs sorted by first line vs title respectively; cross-links switch grouping/sort correctly.
5. `/en/a-z/` and `/en/contents/` show "All audios" link; a book without audio hides it and its audio URLs 404.
6. Check `<head>` of an audio page: canonical/hreflang via `getAlt` and JSON-LD `CollectionPage` use the nested path with trailing slash.

**Decisions**
- Sorting matches existing semantics: a-z variants show/sort first lines, contents variants titles.
- By-song pages keep existing groups filtered to `has.audio`; a-z alt-first-line duplicates are deduped.
- Singer order: first appearance in book order, Dev-Goswami Maharajs moved to the front; group key is `title.en`, display localized.
- Data built in `lib/audio.ts` at build time (no `scripts` changes, no `audio.json`).
- Books without audio: link hidden, routes not generated.
- Excluded: sitemap entries, global hotkey/help-modal entry, player changes.

**Further Considerations**
1. Many `PlayerWidget`s per page (en book could reach several hundred) — the player test page already stress-tests 100; if initial render feels heavy, a follow-up could collapse groups or lazy-mount widgets. Recommend shipping as-is first.
2. `TSongbookPage` widening: Option A — add `TAudioPage` to the union (simplest, lets `LdJson`/`getPageMeta`/`getAlt` work untouched; recommended). Option B — separate `getAudioPagePath` helper and overloads in metadata helpers (more code, no benefit).
