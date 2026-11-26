---
description: "Use when modifying the /[bookId]/audio pages: the singers index and per-singer playlist at /[bookId]/audio/[singerId], the lib/audio.ts data builders (getSingers, getSingerTracks, param lists), TSinger/TAudioTrack, components/audio (AudioPage, SingerList, Playlist, PlaylistLink), audio page metadata/JSON-LD/sitemap, or the links to the audio page from contents and a-z."
applyTo: ["app/[[]bookId]/audio/**", "components/audio/**", "lib/audio.ts", "types/audio.ts", "other/metadata/getAudioPageMeta.ts", "other/metadata/LdJsonAudio.tsx"]
---

# /audio Pages

Two statically generated routes share one view (`components/app/views/AudioView.tsx` → `AudioPage`):

| Route | File | Data | Content |
|---|---|---|---|
| `/[bookId]/audio/` | `app/[bookId]/audio/page.tsx` | `/data/<bookId>/audio/index.json` (kind `audio`) | `SingerList` + playlist of all recordings ("All recordings" selected) |
| `/[bookId]/audio/[singerId]/` | `app/[bookId]/audio/[singerId]/page.tsx` | `/data/<bookId>/audio/<singerId>.json` (kind `audio-singer`) | `SingerList` + playlist of that singer's recordings |

Both page files are `definePage` stubs with `dynamicParams = false`. Their route objects are `lib/pageData/routes/audio.tsx` and `audioSinger.tsx`: `list` gives the audio page only to books with audio and one page per singer, `load` builds the page data (an unknown singer -> `null` -> `notFound()`), `jsonLd` renders `LdJsonAudio`. The JSON is emitted by `app/data/[bookId]/audio/[file]/route.ts` (`defineDataHandler('audio')`); see `app-routes.instructions.md`.

## Data (`lib/audio.ts`)

- Source of truth is each song JSON's `resources.audio` (`TAudio`: `title` = singer name, `personSlug`, `embed_url`), discovered from contents items with `has.audio`, type `song`, and no `(hidden)` in the title.
- `getSongAudioMap(bookId)` reads song files; memoized **only in production** (dev re-reads so source edits show without restart).
- `forEachRecording` visits each song once, in contents order, and is the single iteration primitive. Build new aggregates on it.
- `getSingers`: first-appearance order, then `sortSingers` (Dev-Goswami Maharajs first). `count` = recordings in the book.
- `getSingerTracks`: flat `TAudioTrack[]` (`item`, `label` = `aliasName || title`, `order` = position in contents, `url`) sorted with `compareFirstLines`.
- `hasBookAudio` drives every "audio exists" check: page metadata (`hasPage`), sitemap, the `audio` loader, and `hasAudio` in the contents / a-z page data, which `Contents.tsx` / `AZ.tsx` receive as a prop for the audio link. Reuse it in loaders; components get the boolean, they don't call it.

## Components (`components/audio`)

- `AudioPage`: title (`AUDIO_PAGE.LINK_FULL_TITLE`), `SingerList`, and when a singer is selected a `<section id="audio-playlist">` with `Playlist`. Rendered inside the client app from page data (`TAudioData` / `TAudioSingerData`): no `lib/*` calls.
- `SingerList`: `<nav>` of plain `<a>` links to `getAudioSingerPath` (intercepted by the app router, so switching singers loads only JSON and doesn't stop playback); selected one has `aria-current="page"`. With more than 6 singers only a window of 6 around the selected one is shown (rest get `SingerList__item--extra`); the client `SingerListCollapse` renders a "Show all <count>" button (`AUDIO_PAGE.SHOW_ALL`) that reveals them.
- `Playlist` (client, renders every track): `<PlayerWidget>` (title = track label, `subtitle` = singer name, default `autoAdvance` = **true**, so tracks play on; `loop`, so after the last track the first one starts) + `PlaylistLink` to the song via `getSongPathWithPage(bookId, item)`, showing the paper page number when present. It does not mount a dock; the single `PlayerDock` lives in `AppRoot`.
- `PlaylistSort` (segmented control inside `Playlist`, native radios): `TAudioSort` `firstLine` (default: first lines, server order), `title` (`item.title`, re-sorted by `order`) or `shuffle` (random order, reshuffled on each load/switch to it; titles shown as first lines). Choice lives in `sessionStorage` via `getAudioSort`/`setAudioSort` and is read with `useSyncExternalStore` (static HTML is always first-line). Rows are keyed by `order` so players survive the reorder; after a switch `Playlist` reports `{ sort, order }` with `playerManager.setPageView` and calls `playerManager.refresh()`. On the page the playing playlist was started on, this reorders the playlist (dock prev/next follow the new sort); on any other `/audio` page it only updates the dock and never touches the playing playlist. When that page is shown again (dock title, Back, a link) it starts from that view (`getPlaylistView`) instead of `sessionStorage`, so the sort and the exact shuffle match the queue. A restored sort is not written to `sessionStorage` and does not animate; only a click on the control does.
- No auto-scroll to the playlist on load.

Player internals (widget, dock, manager) are covered by `player-widget.instructions.md`; don't duplicate them here.

## URLs and metadata

- Never hardcode paths: use `SONGBOOK_PAGE.AUDIO`, `getAudioSingerPath(bookId, singerId)`, `getAudioSingerPage(singerId)` from `other/paths.ts` (trailing-slash convention applies; see `paths.instructions.md`).
- Metadata: `other/metadata/getAudioPageMeta.ts` (`getAudioPageMeta`, `getAudioSingerPageMeta`). Index title is `LINK_FULL_TITLE – book`, description lists singers; singer title is `singer – book`, description is `singer – SCHEMA.DESCRIPTION` (no track names). Descriptions are also set on OG/Twitter.
- JSON-LD: `other/metadata/LdJsonAudio.tsx` – `CollectionPage` + `BreadcrumbList` + `ItemList` of `MusicRecording` (one per rendered track, `recordingOf` -> the song's `#composition` from `LdJsonSong`). Passed as `extras` from the route `page.tsx` (static HTML only); pass the same `tracks` the page data has.
- New user-visible strings go through `translate(bookId, 'AUDIO_PAGE.*' | 'SONG_PAGE.*')`; edit `source/translations.json` and the schema together (see `translations-schema.instructions.md`).
- New singer pages must be added in `app/sitemap.ts` (already driven by `getSingers`).

## Styling

`AudioPage.scss`, `SingerList.scss`, `Playlist.scss` sit next to their components. The page wrapper reuses `Main__container` / `IndexPage__title` / `Main__content` like other index pages. Pages with a dock get bottom padding from `Layout.scss` (`has-player-dock`).
