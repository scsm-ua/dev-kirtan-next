---
description: "Use when modifying the inline audio player: PlayerWidget, PlayerDock, PlayToggle, SeekBar, PlayerSyncToggle, PlayerController, PlayerManager singleton, usePlayer hook, source plugins (audio / soundcloud) and the plugin registry, TPlayer* types, the --player-dock-height / has-player-dock layout contract, or the /test/player/ playground."
applyTo: ["components/player/**", "other/player/**", "types/player.ts", "app/test/player/**"]
---

# Player Widget Architecture

Logic lives in `other/player/`, views in `components/player/`, types in `types/player.ts`. Playground: `app/test/player/`.

```
PlayerWidget (inline row) ──usePlayer──► PlayerController (one per widget, owns lazy adapter)
                                              │ requestPlay / handleEnded
PlayerDock (fixed bar) ◄── snapshot ── PlayerManager (app-wide singleton, owns the queue)
                                              │ getPlugin(type)
                                         registry ► plugins/{audio,soundcloud}
```

The app navigates client-side (see `app-architecture.instructions.md`), so the manager, the shared `<audio>`/iframe and the single `PlayerDock` in `components/app/AppRoot.tsx` outlive page views. Playback continues across navigation.

## Layers

- **Plugin** (`TPlayerSourcePlugin`): `type`, `match(url)`, `createAdapter(url, events)`, optional `getAction(url)` (link/download button in the dock). Registered in `plugins/index.ts` via `registerPlugin`; `detectType` iterates in reverse so later registrations win; fallback type is `audio`.
- **Adapter** (`TPlayerAdapter`): `play/pause/seek/destroy`. **Must not touch the network until the first `play()`.** Reports through `TPlayerAdapterEvents` (`onStatus/onProgress/onEnded/onError`).
- **`PlayerController`**: UI-agnostic store (`subscribe`/`getSnapshot` for `useSyncExternalStore`). Created once per widget, bound to the initial `source` (re-key the widget to change it). `title` follows the widget prop via `setTitle` (silent). Options `{ autoAdvance, key, originPath }`: `key` = `` `${originPath}|${url}` ``, `originPath` = path of the page the widget was rendered on.
- **`PlayerManager`** (`playerManager`): tracks mounted controllers, the single `active` one and an explicit `queue`.
  - While the active widget is connected, the queue is the **DOM order** of the page's widgets (`getPageOrder`, recomputed on every emit). Call `refresh()` after reordering widgets or changing titles.
  - When its page is left, the active widget unmounts but the queue is **frozen**: `unregister` returns `true` and its controllers are kept alive without widgets, so prev/next/auto-advance keep working on any page.
  - `acquire(key, create)` hands a kept-alive controller back to a widget when its page is shown again (back navigation, dock title click).
  - Handover: when a widget registers while the active controller's widget is gone and both have the same `source.url`, `register` makes the new controller adopt the running adapter and snapshot (`PlayerController.adoptFrom`; adapter events follow via `binding`), so the dock continues in the inline widget of the page now shown without restarting the track. The old frozen queue is released.
  - `releaseDetached()` destroys the kept-alive controllers when the dock is closed (`clearActive`) or a player outside the queue starts.
  - `playFirst` picks the first **connected** widget in DOM order.
- **`usePlayer`**: reads `PagePathContext` (`other/router/pagePath.ts`) for `originPath`, gets its controller via `playerManager.acquire`, subscribes to snapshot + `isActive`, registers/unregisters with the manager, and on unmount calls `controller.destroy()` **only if** `unregister` didn't keep it alive. Teardown is deferred by a microtask and skipped if the effect set up again: dev StrictMode re-runs effects of keyed list items that React moves, which would otherwise kill playback on a reorder.

## Shared resources (keep it this way)

- The `audio` plugin shares ONE `<audio>` element; only the current owner holds `src`.
- The `soundcloud` plugin shares ONE hidden iframe and swaps tracks via `widget.load()`.
- The SC iframe must be real-sized (300x166, hidden via `opacity` + `clip-path`), **not 1x1px** - the widget draws a waveform canvas from frame size and throws on 0 width. `allow` needs `autoplay; encrypted-media; unload`.
- `window.SC` is already declared in `types/common.ts` - do not redeclare.

## Behavior rules

- `PlayerController.play()`: if the controller isn't the manager's active one (switch, next/prev, auto-advance) it seeks to 0 first; resuming the active track keeps position. `ended` also restarts at 0.
- `playPrev`: restarts the current track if `position > RESTART_THRESHOLD` (3s) or there is no previous; otherwise plays the previous.
- `handleEnded` auto-advances only when the ending controller's own `autoAdvance` is true. It comes from the `PlayerWidget` `autoAdvance` prop (default `true`; the song page's `AudioList` passes `false`), so the rule travels with the track, not with the page currently shown.
- Optional `subtitle` flows `PlayerWidget -> usePlayer -> PlayerController`; the dock renders `title · <span class="PlayerDock__subtitle">`. The inline widget never shows it.
- Lint (`react-hooks/immutability`): don't assign props onto values held in `useState`; use methods (e.g. `controller.setElement`).

## Views

- **`PlayerWidget`**: one flex row - small `PlayToggle` + title. When active, renders `<SeekBar readOnly>` (no thumb/handlers, `role=progressbar`) absolutely positioned under the title so row height never changes. Row click toggles; the button `stopPropagation`s and stays the keyboard target.
- **`PlayerDock`**: mounted **once, in `AppRoot`**, no props. Never mount it from a page or view. Visible whenever the manager has `active`; only the X closes it (which also releases a frozen queue). Keeps rendering the last controller while sliding out. Adds `has-player-dock` to `<html>`. Clicking the dock title calls `showInline`: navigates to the controller's `originPath` (if it's another page) and scrolls to the widget once it is mounted again.
- **`PlayerControls.tsx`** exports only `PlayerAction` (dock).
- **`PlayerSyncToggle`**: a `PlayToggle` bound to the manager's active controller **only while that controller's widget is connected** (on this page); otherwise it shows "play" and calls `playerManager.playFirst()`.

## Dock layout contract

- `--player-dock-height`: `<576px` = 124px (title row 16 + controls 44 + seek 24 + 2x8 gaps + 2x12 padding), `>=$bp576` = 100px (title merges into the controls grid row: title | action | transport | close), plus safe-area inset; 12px bottom padding + inset.
- Pages with a dock must pad for it: `Layout.scss` uses `.has-player-dock &` -> `padding-bottom: max(0px, calc(var(--player-dock-height) - var(--footer-height)))`. Since the dock is app-wide, every app page gets this padding while something plays. Reuse that pattern for any new fixed-position content.
- Dock button hover is gated by `(hover: hover) and (pointer: fine)` to avoid sticky touch highlights; `:active` gives press feedback. In browser tap checks wait for release/paint before reading the final background.

## Adding a source type

1. Create `plugins/<type>.ts` exporting a `TPlayerSourcePlugin`.
2. Register it in `plugins/index.ts`.
3. Share any heavy resource (element/iframe) at module level like the existing plugins; never create per-widget iframes.
4. Verify on `/test/player/` (add a sample URL there), then on a real page: play, navigate to another page, and check prev/next and auto-advance still work from the dock.

## Known issue

Each SoundCloud `widget.load()` adds a history entry inside the hidden iframe, so after a track switch the first browser Back press may seem to do nothing. A fresh iframe per track would fix it but may break iOS auto-advance; undecided.
