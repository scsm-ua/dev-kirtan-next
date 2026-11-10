---
description: "Use when modifying how the new player and playlists appear on the song page: AudioList under the verses, the PlayerSyncToggle play button in SongHeader, the song-page PlayerDock (autoAdvance off), song title as dock subtitle, or the has-audio gating in SongBody/SongHeader."
applyTo: ["components/song/AudioList/**", "components/song/SongHeader.tsx", "components/song/SongHeader.scss", "components/content/SongBody.tsx"]
---

# Player on the Song Page

Core player architecture is in `player-widget.instructions.md`; the singer playlist pages are in `audio-pages.instructions.md`. This file covers only the song-page wiring.

## Pieces

| Piece | File | Role |
|---|---|---|
| `AudioList` | `components/song/AudioList/AudioList.tsx` (client) | Playlist of this song's recordings, rendered by `SongBody` after `SongText` |
| `PlayerSyncToggle` | `components/player/PlayerSyncToggle.tsx` | Play/pause button in the song title that mirrors the active track |
| `PlayerDock` | mounted inside `AudioList` | Fixed bottom bar |

## Gating

Both `AudioList` (in `SongBody`) and `PlayerSyncToggle` (in `SongHeader`) render only when `song.resources?.audio?.length > 0`. Keep these conditions identical so the toggle never exists without a list.

## AudioList

- One `<li>` per `TAudio`: `PlayerWidget` (`source={{ url: item.embed_url }}`, `title={item.title}` = singer name, `subtitle={songTitle}`) + a chevron `<a>` to `getAudioSingerPath(bookId, item.personSlug)`.
- `songTitle` is `song.title?.join(' ')`; it appears only in the dock as `singer · song title`, which is how the dock stays meaningful when scrolled away from the song.
- Mounts `<PlayerDock autoAdvance={false} />`: on a song page, finishing one recording must NOT roll into the next singer's version (unlike `/audio/[singerId]` where auto-advance is on). Prev/next buttons in the dock still work between recordings in DOM order.
- Section caption comes from `SONG_PAGE.AUDIO_CAPTION` (passed in by `SongBody`).

## PlayerSyncToggle in SongHeader

- Rendered inline at the start of the **first** title group (`index === 0`), with class `SongHeader__play`.
- Click: if the manager has an active controller -> `active.toggle()`; otherwise `playerManager.playFirst()` (first widget in DOM order = first recording in `AudioList`).
- Layout: `inline-flex`, `vertical-align: middle`, margin `-3px 10px 0 0`. Tried and rejected: absolute corners, float on the last line, flex-stretch with `calc(100% - 25px)` spacer (overflows when a float adds a wrapped line). Don't reintroduce them.
- It reads state via `useSyncExternalStore(playerManager.subscribe, getActive, getServerActive)`; keep a server snapshot of `null` to avoid hydration mismatch.

## Rules of thumb

- Only one `PlayerDock` per page. Don't add another to `SongBody`/other song components; `AudioList` owns it.
- Don't pass `subtitle` on pages where the widget title already includes context (audio pages pass the singer name instead).
- `SongBody` is a server component; `AudioList` and the player pieces are client components. Pass plain serializable props only (`audio`, `bookId`, `caption`, `songTitle`).
- Song pages get bottom padding for the dock via `has-player-dock` in `Layout.scss`; no per-component handling needed.
- Swipe/hotkey navigation (see `song-navigation.instructions.md`) is independent of the player; they don't share state.
