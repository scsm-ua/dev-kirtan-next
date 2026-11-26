## Plan: Single-page audio index by singer

Replace the four audio index routes with one page `/[bookId]/audio/[singerId]/` (plus a bare `/[bookId]/audio/` singer list). Top: vertical list of singers (link + recording count, selected highlighted). Below: flat playlist sorted by first line, each row = inline `PlayerWidget` (left) + page-number/chevron link to the song text (right, styled like `ContentItem`). Dock shows song first line · singer name. Remove all old audio index widgets, legacy song-page audio widgets, and restore the "All audio" link grouped tightly with the "Index by titles" link on `/contents` and `/a-z`.

**Steps**

*Phase 1 — paths & types* (foundation, blocks everything)
1. `paths.ts`: add `AUDIO: 'audio'` to `SONGBOOK_PAGE` (auto-excludes it from hotkey song-page detection); delete `AUDIO_PAGE`/`TAudioPage`; add a template-literal type `TAudioSingerPage = \`audio/${string}\``, `getAudioSingerPage(singerId)` and `getAudioSingerPath(bookId, singerId)` → `/en/audio/<slug>/`; `TSongbookPage` = `SONGBOOK_PAGE` values ∪ `TAudioSingerPage` so `getPageMeta`/`getAlt`/`LdJson` keep working unchanged.
2. `audio.ts`: replace with `TSinger { id, name, count }` and `TAudioTrack { item: TContentItem; label: string; url: string }`; drop `TAudioEntry`, `TAudioGroup`, `TAudioSort`. Add `SingerPageProps` to `book.ts`. Update the `AUDIO_PAGE` paragraph in `paths.instructions.md`.

*Phase 2 — data* (*depends on 1–2*)
3. `audio.ts`: keep `getSongAudioMap`, `hasBookAudio`, `getAudioBookIdParamList`; remove `getAudioBySong`/`getAudioBySinger`. Add private `slugify(personId)` (NFD → strip diacritics → lowercase → non-alnum to `-`), `getSingers(bookId)` (first-appearance order, Dev-Goswami first as today, `count` = recordings), `getSingerTracks(bookId, singerId)` (flat list, `label = item.aliasName`, sorted with `compareFirstLines`; duplicate recordings → duplicate rows), `hasSinger(bookId, singerId)`, `getSingerParamList()` for `generateStaticParams`.

*Phase 3 — components* (*depends on 3; 4–6 parallel*)
4. New `components/audio/SingerList.tsx` + scss: `<nav><ul>`, one `<a href={getAudioSingerPath(...)}>` per line with name and `(count)`; selected gets `--active` modifier + `aria-current="page"`. New `components/audio/Playlist.tsx` + scss: `<ul>` of two-column rows — left `PlayerWidget source={{url}} title={label} subtitle={singerName}` (gives the dock "first line · singer"), right `<a href={getSongPathWithPage(bookId, item)} title={item.title}>` with page + `icon-chevron-right` (mirror `ContentItem__page/__suffix/__icon` from `ContentItem.scss`); mounts `PlayerDock` once. New `components/audio/AudioPage.tsx` (server) composing h1 (`AUDIO_PAGE.LINK_FULL_TITLE`) + `SingerList` + optional `<h2>{singer.name}</h2>` + `Playlist`.
5. `IndexLink.tsx` + scss: add `compact?: boolean` → `IndexLink--compact` that zeroes `__content` bottom margin so the next link sits directly beneath. In `Contents.tsx` and `AZ.tsx`: re-import `hasBookAudio`, give the first `IndexLink` `compact={hasAudio}`, and add the "All audio" `IndexLink` (`SONGBOOK_PAGE.AUDIO`, `AUDIO_PAGE.LINK_FULL_TITLE`) right after it.
6. Delete `components/audio/AudioIndex.tsx/.scss`, `AudioEntry.tsx/.scss`, and legacy `components/song/AudioList/AudioListItem.tsx/.scss`, `AudioLoader.tsx`.

*Phase 4 — routes & meta* (*depends on 3–4*)
7. Delete `a-z`, `contents`, `audio`, `audio`. Add `app/[bookId]/audio/page.tsx` (`generateStaticParams = getAudioBookIdParamList`, renders `AudioPage` with no selection) and `app/[bookId]/audio/[singerId]/page.tsx` (`generateStaticParams = getSingerParamList`), both using the `Layout` + `BookDescription` + `LdJson pageKey="AUDIO_PAGE"` shell from the current [app/[bookId]/audio/a-z/page.tsx](app/[bookId]/audio/a-z/page.tsx).
8. Rewrite `getAudioPageMeta.ts` into `getAudioPageMeta` (`page: SONGBOOK_PAGE.AUDIO`, `hasPage: hasBookAudio`) and `getAudioSingerPageMeta` (`page: getAudioSingerPage(singerId)`, `hasPage: id => hasSinger(id, singerId)`). Add an optional `title` override to `getPageMeta` in `getPageMeta.ts` so singer pages get `"<singer> – <book>"` instead of duplicate titles. Add audio index + singer pages to `sitemap.ts` (priority 0.8).

*Phase 5 — translations* (*parallel with 3–8*)
9. Remove `AUDIO_PAGE.BY_SINGER`, `BY_SONG`, `SORT_FIRST_LINES`, `SORT_TITLES` from all 6 languages in `translations.json` and from `required`/`properties` in `validationSchema.js`. Keep `HEAD`, `SCHEMA`, `LINK_FULL_TITLE`.

**Relevant files**
- `audio.ts` — rewrite grouping into `getSingers` / `getSingerTracks`; reuse `compareFirstLines`, `isMain`, `getSongAudioMap`
- `paths.ts` — `SONGBOOK_PAGE.AUDIO`, `getAudioSingerPath`, remove `AUDIO_PAGE`
- `PlayerWidget.tsx` — reuse as-is (`title`/`subtitle` already flow to `PlayerDock`)
- `ContentItem.tsx` — style reference for the right-hand page/chevron widget
- `AuthorBadges.scss` — reference for list styling tokens (`--gray`, `--accent-color`, `--song-bg-color`)
- `useGlobalHotkeys.ts` — no change; `NON_SONG_SEGMENTS` derives from `SONGBOOK_PAGE`, and singer URLs have 3 segments

**Verification**
1. `node scripts/validate.js` passes; `pnpm lint` passes.
2. `pnpm build` — static export emits `out/en/audio/index.html` and one folder per singer; grep for `AUDIO_PAGE\.(BY_|SORT_)|getAudioBySong|getAudioBySinger|AudioIndex|AudioEntry|AudioLoader|AudioListItem` returns nothing.
3. Manual: `/en/audio/` shows singers only; `/en/audio/srila-b-s-govinda-dev-goswami-maharaj/` highlights the singer, playlist sorted by first line, duplicate recordings appear as separate rows; clicking play shows dock "first line · singer"; next/prev in dock advance down the list; right-column link opens the song (with `?p=` for multi-page songs); `/en/contents/` and `/en/a-z/` show "Index by titles"/"Contents" + "All audio" as a tight pair; song page audio list still works.

**Decisions**
- Dock on audio page: title = song first line, subtitle = singer name (song page `AudioList` unchanged).
- Bare `/audio/` route renders only the singer list; "All audio" links target it.
- Slug = auto-slug of `personId` (English), stable across book languages → hreflang alternates via `getAlt` work with `hasSinger`.
- Singer order keeps current rule (Dev-Goswami first, then first appearance).
- Legacy `AudioListItem`/`AudioLoader` are deleted.
- Out of scope: a hotkey for the audio page, JSON-LD `MusicPlaylist`, per-singer descriptions.

**Further Considerations**
1. Sitemap — recommend **including** singer pages: they are already `index`-able via `getPageMeta` robots, have unique content ("all recordings of X" is a plausible query), and it's a one-line addition; the richer SEO work (per-singer descriptions, structured data) stays deferred. Option B: leave the sitemap untouched until the SEO task.
2. Singer-row highlight style — recommend bold title + accent left border (reads as "selected" without a second color scheme). Option B: filled chip background like a pressed `Pills__button`.
