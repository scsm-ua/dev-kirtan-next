## Plan: Bottom Dock Player — Always-On Transport Bar

Turn `PlayerDock` into a fixed-height (72px, same as the footer) bottom bar that covers the Footer, is visible whenever any player is active (playing / paused / ended), closes only via a large X, and gains prev / −5s / play-pause / +5s / next, current & total time around the seek bar, plus the link/download button. Content remains scrollable above it (matters in left-sidebar mode where `--footer-height` is 0). Inline-visibility tracking becomes dead and is removed.

**Steps**

Phase 1 — Logic (`player`)
1. `PlayerManager.ts`: snapshot becomes `{ active, hasPrev, hasNext }`; generalize `getNext` into `getSibling(current, direction)` (same `compareDocumentPosition` logic, mirrored for previous); add `playNext()` and `playPrev()` (prev rule: `active.position > 3` → `active.seek(0)`, else previous sibling `.play()`, else `seek(0)`); `handleEnded` uses `getSibling(+1)`; `emit()` recomputes `hasPrev/hasNext`; also `emit()` in `register/unregister` when `active` is set; delete `handleVisibility` and `inlineVisible`.
2. `PlayerController.ts`: add `seekBy(delta)` → `seek(clamp(position + delta, 0, duration))` (no-op if `duration` null); remove `inlineVisible` / `setInlineVisible`. *parallel with 1*
3. `usePlayer.ts`: remove `observer`, `observed`, `getObserver` and their effect code; keep `setElement`, `register/unregister`, `destroy`. *parallel with 1–2*

Phase 2 — Views (`player`) *(depends on Phase 1)*
4. `icons.tsx`: add `PrevTrackIcon`, `NextTrackIcon`, `Replay5Icon`, `Forward5Icon` (circular arrow with "5" glyph), same `Svg` wrapper.
5. Extract the play/pause button (with `--loading` spinner and `--error` styles) from `PlayerControls.tsx` / `PlayerControls.scss` into `PlayToggle.tsx/.scss`; `PlayerControls` renders `PlayToggle`. Inline widget look unchanged.
6. `PlayerDock.tsx`: `visible = !!active` (drop `inlineVisible`); subscribe to manager for `hasPrev/hasNext`; layout —
   - row 1: `p.PlayerDock__title` (omitted if no title; content vertically centered in fixed height)
   - row 2: `[prev][−5][PlayToggle][+5][next]` … spacer … `[link/download][close]` — prev/next disabled via `hasPrev/hasNext` (prev stays enabled when `position > 3`), ±5 disabled while `duration` null, close 36px
   - row 3: `span.PlayerDock__time` (`formatTime(position)`) + `SeekBar` + `span.PlayerDock__time` (`formatTime(duration)`)
   - `useEffect` toggling class `has-player-dock` on `document.documentElement` while visible (cleanup on unmount).
7. `PlayerDock.scss`: `position: fixed; left: var(--sidebar-width,0); right: 0; bottom: 0; height: var(--player-dock-height); z-index: 9000`; hidden state `translateY(100%)`; drop `--player-dock-bottom`, outer padding, rounded card and `pointer-events` trick; `__inner` `max-width: var(--page-max-width)`, `overflow: hidden`, background `--song-bg-color`, top shadow; `__btn` 32px round transparent → `--btn-bg` on hover, `--close` 36px; `__time` 12px `font-variant-numeric: tabular-nums`, min-width to avoid jitter; `@media print { display: none }`.

Phase 3 — Layout integration *(parallel with Phase 2)*
8. `variables.scss`: add `--player-dock-height: 72px` next to `--footer-height` (independent var so it stays 72px in sidebar mode and can be enlarged later).
9. `Layout.scss`: `.has-player-dock .Layout__content { padding-bottom: max(0px, calc(var(--player-dock-height) - var(--footer-height))) }` → 0 in bottom-footer mode (dock exactly covers footer), 72px in sidebar mode.
10. `page.tsx` + `PlayerTestPage.scss`: equivalent padding rule under `.has-player-dock`, update help text (dock stays until closed; next/prev; ±5).

**Relevant files**
- `PlayerManager.ts` — `getNext` → `getSibling`, snapshot shape, `clearActive` (already pauses)
- `PlayerController.ts` — `seek`, `update`, snapshot
- `usePlayer.ts` — `useControllerSnapshot` reused by dock
- `formatTime.ts` — returns `--:--` for null duration
- `SeekBar.tsx` — reused as-is (already disabled while `duration` null)
- `Footer.scss` — z-index 10 (dock 9000 covers it); sidebar-mode mixin precedent
- `AudioList.tsx` — mounts `PlayerDock` on real song pages (no change)

**Verification**
1. `pnpm type-check` and `pnpm lint` pass; no remaining references to `inlineVisible`, `handleVisibility`, `--player-dock-bottom`.
2. `/test/player/`: play → dock appears and stays while scrolling anywhere; pause → still visible; X → playback stops and dock hides.
3. Next/prev: next plays following widget; prev at >3s restarts, at <3s goes to previous; buttons disabled at list ends (prev enabled when >3s). Track end → next auto-plays; last track end → dock stays with Play (replay).
4. −5/+5 clamp at 0 and duration; disabled for SoundCloud until READY; times update, total shows `--:--` before duration known.
5. Song page with audio, bottom-footer mode (<1200px): dock fully covers footer, no content hidden. Sidebar mode (≥1200px wide, ≤800px tall): dock starts at sidebar's right edge, last content scrolls fully above dock.
6. 320px width: row 2 fits on one line (5×32 + link 28 + close 36 + gaps < 296px); row 3 times + seek bar fit.
7. Print preview: dock hidden.

**Decisions**
- Fixed `--player-dock-height: 72px` (per user), no ResizeObserver; rows sized to fit (title 18 / buttons 32 / seek 16 + padding).
- Dock visible iff `active` set; `ended` keeps it visible; only X (or unmount) clears.
- Prev: restart if >3s, else previous track. Times always flank seek bar. ±5 via SVG icons with "5".
- Close = `clearActive()` (pause + unset); position not reset so inline widget can resume.
- Out of scope: i18n for labels (stay English like existing aria-labels), hotkeys, volume, inline widget changes.

**Further Considerations**
1. 72px is tight for three rows; if the title row doesn't fit cleanly the var can be bumped (e.g. 88px) — the padding formula and sidebar reservation adapt automatically.
2. In bottom-footer mode the dock hides footer navigation entirely while active — intended per request; nothing else needed.
