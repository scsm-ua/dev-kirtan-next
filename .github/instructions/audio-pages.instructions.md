---
description: "Use when modifying the /[bookId]/audio pages: the singers index and per-singer playlist at /[bookId]/audio/[singerId], the lib/audio.ts data builders (getSingers, getSingerTracks, param lists), TSinger/TAudioTrack, components/audio (AudioPage, SingerList, Playlist, PlaylistLink, ScrollToPlaylist), audio page metadata/JSON-LD/sitemap, or the links to the audio page from contents and a-z."
applyTo: ["app/[[]bookId]/audio/**", "components/audio/**", "lib/audio.ts", "types/audio.ts", "other/metadata/getAudioPageMeta.ts"]
---

# /audio Pages

Two statically generated routes share one `AudioPage` component:

| Route | File | Content |
|---|---|---|
| `/[bookId]/audio/` | `app/[bookId]/audio/page.tsx` | `SingerList` only |
| `/[bookId]/audio/[singerId]/` | `app/[bookId]/audio/[singerId]/page.tsx` | `SingerList` + playlist of that singer's recordings |

Both use `dynamicParams = false`; `generateStaticParams` comes from `lib/audio.ts` (`getAudioBookIdParamList`, `getSingerParamList`). An unknown singer -> `notFound()`. Books without audio get no page.

## Data (`lib/audio.ts`)

- Source of truth is each song JSON's `resources.audio` (`TAudio`: `title` = singer name, `personSlug`, `embed_url`), discovered from contents items with `has.audio`, type `song`, and no `(hidden)` in the title.
- `getSongAudioMap(bookId)` reads song files; memoized **only in production** (dev re-reads so source edits show without restart).
- `forEachRecording` visits each song once, in contents order, and is the single iteration primitive. Build new aggregates on it.
- `getSingers`: first-appearance order, then `sortSingers` (Dev-Goswami Maharajs first). `count` = recordings in the book.
- `getSingerTracks`: flat `TAudioTrack[]` (`item`, `label` = `aliasName || title`, `url`) sorted with `compareFirstLines`.
- `hasBookAudio` drives every "audio exists" check: page metadata (`hasPage`), sitemap, and the audio link in `Contents.tsx` / `AZ.tsx`. Reuse it; don't re-derive.

## Components (`components/audio`)

- `AudioPage` (server): title (`AUDIO_PAGE.LINK_FULL_TITLE`), `SingerList`, and when a singer is selected a `<section id="audio-playlist">` with `ScrollToPlaylist` + `Playlist`.
- `SingerList`: `<nav>` of plain `<a>` links to `getAudioSingerPath`; selected one has `aria-current="page"`.
- `Playlist` (renders every track): `<PlayerWidget>` (title = track label, `subtitle` = singer name) + `PlaylistLink` to the song via `getSongPathWithPage(bookId, item)`, showing the paper page number when present. Mounts one `<PlayerDock />` with default `autoAdvance` (**true**) so tracks play on in DOM order.
- `ScrollToPlaylist`: on mount scrolls `#audio-playlist` into view, but only if `.Layout__content` has not been scrolled already. Keep the `id` and the container class in sync with it.

Player internals (widget, dock, manager) are covered by `player-widget.instructions.md`; don't duplicate them here.

## URLs and metadata

- Never hardcode paths: use `SONGBOOK_PAGE.AUDIO`, `getAudioSingerPath(bookId, singerId)`, `getAudioSingerPage(singerId)` from `other/paths.ts` (trailing-slash convention applies; see `paths.instructions.md`).
- Metadata: `other/metadata/getAudioPageMeta.ts` (`getAudioPageMeta`, `getAudioSingerPageMeta`). JSON-LD via `LdJson` with `pageKey="AUDIO_PAGE"`.
- New user-visible strings go through `translate(bookId, 'AUDIO_PAGE.*' | 'SONG_PAGE.*')`; edit `source/translations.json` and the schema together (see `translations-schema.instructions.md`).
- New singer pages must be added in `app/sitemap.ts` (already driven by `getSingers`).

## Styling

`AudioPage.scss`, `SingerList.scss`, `Playlist.scss` sit next to their components. The page wrapper reuses `Main__container` / `IndexPage__title` / `Main__content` like other index pages. Pages with a dock get bottom padding from `Layout.scss` (`has-player-dock`).
