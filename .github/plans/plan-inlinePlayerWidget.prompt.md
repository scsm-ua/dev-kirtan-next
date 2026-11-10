## Plan: Inline Audio Player Widget (mp3 + SoundCloud, pluggable)

Build a self-contained player feature split into framework-agnostic logic (`other/player/`: plugin registry, per-widget controller, singleton manager for sync / playlist / dock) and React views (`components/player/`: PlayerWidget, PlayerControls, SeekBar, PlayerDock). Two source plugins ship: `audio` (lazy `HTMLAudioElement`, `preload="none"`) and `soundcloud` (lazy hidden iframe + SC Widget API, shared script loader — reusing the pattern in [components/song/AudioList/AudioLoader.tsx](components/song/AudioList/AudioLoader.tsx)). A test page at `/test/player/` renders 4 sample players. Song pages untouched.

**Architecture**

```mermaid
flowchart LR
  W[PlayerWidget] --> H[usePlayer hook] --> C[PlayerController per widget]
  C -->|creates via registry| A[Adapter: audio | soundcloud]
  C <--> M[PlayerManager singleton]
  D[PlayerDock] -->|subscribes| M
```

**Steps**

Phase 1 — Types & plugins
1. `types/player.ts`: `TPlayerStatus` (`idle|loading|playing|paused|ended|error`), `TPlayerSource {type,url}`, `TPlayerSnapshot {status, position, duration|null}`, `TPlayerAction {kind:'link'|'download', href, label}`, `TPlayerAdapter {load, play, pause, seek, destroy}`, `TPlayerSourcePlugin {type, match(url), createAdapter(url, events), getAction(url)}`. Add `window.SC` declaration to [types/global.d.ts](types/global.d.ts).
2. `other/player/registry.ts` — `registerPlugin`, `getPlugin`, `detectType(url)` (soundcloud.com host → `soundcloud`, else `audio`). *parallel with 3–4*
3. `other/player/plugins/audio.ts` — `new Audio()` created on first `load()`, `preload='none'`; wires `timeupdate/durationchange/play/pause/ended/error/waiting`; action = download (`target=_blank rel=noopener`; cross-origin `download` attr is ignored by browsers → opens in tab, acceptable).
4. `other/player/plugins/soundcloud.ts` — singleton `loadScApi()` promise for `https://w.soundcloud.com/player/api.js`; on `load()` append a 1×1 offscreen `aria-hidden` iframe (`src` from `getIFrameUrl` in [other/helpers.ts](other/helpers.ts#L43), `allow="autoplay"`) into a hidden body container; bind `READY/PLAY/PAUSE/FINISH/PLAY_PROGRESS/ERROR`, `getDuration` on READY, `seekTo(ms)`; action = link to the SC page. Plus `other/player/formatTime.ts` (s → m:ss).

Phase 2 — Core logic (*depends on 1–4*)
5. `other/player/PlayerController.ts` — per widget: lazy adapter, snapshot, `subscribe/getSnapshot` (for `useSyncExternalStore`), `toggle/play/pause/seek`, `setInlineVisible`, `destroy`; `play()` goes through `manager.requestPlay(this)`; `ended` → `manager.onEnded(this)`.
6. `other/player/PlayerManager.ts` — singleton: `register/unregister(controller, getElement)`, `requestPlay` pauses previous active, `onEnded` → next controller in DOM order (`compareDocumentPosition` sort) → `play()`, `clearActive()` (also pauses), dock snapshot `{active, inlineVisible}` + `subscribe`.
7. `other/player/usePlayer.ts` — creates controller once per widget, registers it, attaches an `IntersectionObserver` on the widget root → `setInlineVisible`, returns snapshot via `useSyncExternalStore`.

Phase 3 — Views (*depends on 7; 8–9 parallel*)
8. `components/player/icons.tsx` — inline SVGs: Play, Pause, Download, ExternalLink/SoundCloud, Close (no icomoon change).
9. `components/player/SeekBar.tsx/.scss` — custom track/fill/thumb with pointer capture; local drag position, commit `seek()` on pointerup; clamps to [0,1] so dragging past the left edge = 0; `role="slider"` + aria values + Arrow/Home/End keys; `.SeekBar__tip` tooltip with time while dragging and on hover (`@media (hover:hover)`); indeterminate/disabled style while `duration` is null.
10. `components/player/PlayerControls.tsx/.scss` — pure view: play/pause/loading button, `SeekBar`, right action anchor (download or link icon). Reused by both widget and dock.
11. `components/player/PlayerWidget.tsx/.scss` — props `{ source, title?, className? }`; row 1 optional `p.PlayerWidget__title`, row 2 `PlayerControls`. BEM classes, per-component SCSS import, CSS vars from [styles/variables.scss](styles/variables.scss) (`--accent-color`, `--btn-bg`, `--shadow-color`, `--transition-duration`).
12. `components/player/PlayerDock.tsx/.scss` — mounted once per page; visible when `active && !inlineVisible`; renders title + `PlayerControls` bound to the active controller + close (x) → `clearActive()`. `position: fixed; bottom: var(--player-dock-bottom, 0); z-index: 9000` (below SwipeNav's 9999), `@media print { display:none }`, slide transition.

Phase 4 — Test page (*depends on 12*)
13. `app/test/player/page.tsx` + `PlayerTestPage.scss` — `'use client'`, own `<html><body>` like [app/test/page.tsx](app/test/page.tsx); 4 widgets (2 mp3, 2 SoundCloud; titles on 2 of them), tall spacers between to exercise docking, `<PlayerDock />`, and a "Render 100 players" toggle to stress-test lazy loading.

Sample sources:
- https://scsmath.com/KirtanGuide/KirtanGuide8thEd-GaudiyaGitanjali-SungByManasaKrishna-final-32kbps/Jasoda_Nandana_Krsna.mp3
- https://scsmath.com/KirtanGuide/KirtanGuide8thEd-GaudiyaGitanjali-SungByManasaKrishna-final-32kbps/Sri_Guru_Arati.mp3
- https://soundcloud.com/bharatimaharaj/shchsm-karakas-dzhaya-guru
- https://soundcloud.com/bharatimaharaj/navadwip-scsm-gurudev-morning

**Relevant files**
- [components/song/AudioList/AudioList.tsx](components/song/AudioList/AudioList.tsx) / [AudioLoader.tsx](components/song/AudioList/AudioLoader.tsx) — reference for SC script injection & Widget events (not modified)
- [other/helpers.ts](other/helpers.ts#L43) — reuse `getIFrameUrl`
- [components/song/PrevNextNav/SwipeNav.scss](components/song/PrevNextNav/SwipeNav.scss), [components/export/ExportToolbar.scss](components/export/ExportToolbar.scss) — fixed-position/z-index precedent
- [components/common/Pills/Pills.tsx](components/common/Pills/Pills.tsx) — component/SCSS template
- [types/global.d.ts](types/global.d.ts) — add `window.SC`

**Verification**
1. `pnpm type-check` and `pnpm lint` pass.
2. `pnpm dev` → `/test/player/`; Network tab shows no mp3/iframe/api.js requests until first play (check with 100-player toggle).
3. Play A then B (mp3→SC and SC→mp3) → previous pauses.
4. Let a track finish → next widget in DOM order auto-plays; last one finishing does nothing.
5. Scroll the active widget out of view → dock appears with identical state; dock controls drive the same instance; close (x) pauses & hides; scrolling back hides dock.
6. SeekBar: drag far left → 0; hover tooltip (desktop), drag tooltip (touch); keyboard arrows/Home/End; indeterminate before duration known.
7. Right button: SC opens track page in new tab; mp3 opens/downloads file.
8. iOS Safari: SC playback starts after a tap (iframe created inside the click handler).

**Decisions**
- Dock = active (playing or paused) player when inline is out of view; closable. Seek-to-0 = drag thumb to left. Time only as tooltips. Title only from props. No hotkeys, no build exclusion, no oEmbed, no AudioList/song-page changes, no volume control.

**Further Considerations**
1. Dock on real pages will overlap the fixed `Footer` (72px) — exposed as `--player-dock-bottom` CSS var so song-page integration later can set it to `var(--footer-height)`.
2. SoundCloud `seek` before READY is ignored by the Widget API; plan keeps SeekBar disabled until duration is known. OK?
