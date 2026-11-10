---
description: "Use when modifying the inline audio player: PlayerWidget, PlayerDock, PlayToggle, SeekBar, PlayerSyncToggle, PlayerController, PlayerManager singleton, usePlayer hook, source plugins (audio / soundcloud) and the plugin registry, TPlayer* types, the --player-dock-height / has-player-dock layout contract, or the /test/player/ playground."
applyTo: ["components/player/**", "other/player/**", "types/player.ts", "app/test/player/**"]
---

# Player Widget Architecture

Logic lives in `other/player/`, views in `components/player/`, types in `types/player.ts`. Playground: `app/test/player/`.

```
PlayerWidget (inline row) ──usePlayer──► PlayerController (one per widget, owns lazy adapter)
                                              │ requestPlay / handleEnded
PlayerDock (fixed bar) ◄── snapshot ── PlayerManager (page-wide singleton)
                                              │ getPlugin(type)
                                         registry ► plugins/{audio,soundcloud}
```

## Layers

- **Plugin** (`TPlayerSourcePlugin`): `type`, `match(url)`, `createAdapter(url, events)`, optional `getAction(url)` (link/download button in the dock). Registered in `plugins/index.ts` via `registerPlugin`; `detectType` iterates in reverse so later registrations win; fallback type is `audio`.
- **Adapter** (`TPlayerAdapter`): `play/pause/seek/destroy`. **Must not touch the network until the first `play()`.** Reports through `TPlayerAdapterEvents` (`onStatus/onProgress/onEnded/onError`).
- **`PlayerController`**: UI-agnostic store (`subscribe`/`getSnapshot` for `useSyncExternalStore`). Created once per widget, bound to the initial `source` (re-key the widget to change it).
- **`PlayerManager`** (`playerManager`): tracks controllers, the single `active` one, `autoAdvance`, `playFirst/playNext/playPrev/clearActive`. Prev/next order is **DOM order** (`compareDocumentPosition` on `controller.element`) - there is no explicit playlist array.
- **`usePlayer`**: creates the controller, subscribes to snapshot + `isActive`, registers/unregisters with the manager, calls `controller.destroy()` on unmount.

## Shared resources (keep it this way)

- The `audio` plugin shares ONE `<audio>` element; only the current owner holds `src`.
- The `soundcloud` plugin shares ONE hidden iframe and swaps tracks via `widget.load()`.
- The SC iframe must be real-sized (300x166, hidden via `opacity` + `clip-path`), **not 1x1px** - the widget draws a waveform canvas from frame size and throws on 0 width. `allow` needs `autoplay; encrypted-media; unload`.
- `window.SC` is already declared in `types/common.ts` - do not redeclare.

## Behavior rules

- `PlayerController.play()`: if the controller isn't the manager's active one (switch, next/prev, auto-advance) it seeks to 0 first; resuming the active track keeps position. `ended` also restarts at 0.
- `playPrev`: restarts the current track if `position > RESTART_THRESHOLD` (3s) or there is no previous; otherwise plays the previous.
- `handleEnded` auto-advances only when `playerManager.autoAdvance` is true. `PlayerDock` sets it from its `autoAdvance` prop and resets to `true` on unmount.
- Optional `subtitle` flows `PlayerWidget -> usePlayer -> PlayerController`; the dock renders `title · <span class="PlayerDock__subtitle">`. The inline widget never shows it.
- Lint (`react-hooks/immutability`): don't assign props onto values held in `useState`; use methods (e.g. `controller.setElement`).

## Views

- **`PlayerWidget`**: one flex row - small `PlayToggle` + title. When active, renders `<SeekBar readOnly>` (no thumb/handlers, `role=progressbar`) absolutely positioned under the title so row height never changes. Row click toggles; the button `stopPropagation`s and stays the keyboard target.
- **`PlayerDock`**: mount once per page (the page decides `autoAdvance`). Visible whenever the manager has `active`; only the X closes it. Keeps rendering the last controller while sliding out. Adds `has-player-dock` to `<html>`.
- **`PlayerControls.tsx`** exports only `PlayerAction` (dock).
- **`PlayerSyncToggle`**: a `PlayToggle` bound to the manager's active controller; if none is active it calls `playerManager.playFirst()`.

## Dock layout contract

- `--player-dock-height`: `<576px` = 124px (title row 16 + controls 44 + seek 24 + 2x8 gaps + 2x12 padding), `>=$bp576` = 100px (title merges into the controls grid row: title | action | transport | close), plus safe-area inset; 12px bottom padding + inset.
- Pages with a dock must pad for it: `Layout.scss` uses `.has-player-dock &` -> `padding-bottom: max(0px, calc(var(--player-dock-height) - var(--footer-height)))`. Reuse that pattern for any new fixed-position content.
- Dock button hover is gated by `(hover: hover) and (pointer: fine)` to avoid sticky touch highlights; `:active` gives press feedback. In browser tap checks wait for release/paint before reading the final background.

## Adding a source type

1. Create `plugins/<type>.ts` exporting a `TPlayerSourcePlugin`.
2. Register it in `plugins/index.ts`.
3. Share any heavy resource (element/iframe) at module level like the existing plugins; never create per-widget iframes.
4. Verify on `/test/player/` (add a sample URL there).
