## Plan: Keep the Playlist Where Play Was Clicked

**Task (original description)**

- When the user clicks play on a player, the playlist of that page is stored for the dock player, so prev/next/auto-advance keep following it.
- If the user navigates to another playlist and does not start another player manually (only navigates and uses other controls), playback keeps following the playlist where the initial click was made.
- A click on the dock title navigates to that initial page, including its sort order on the `/audio` page.
- Only a play click on another page with another playlist makes that one the new active playlist.
- The current track is still shown as active on new pages that have it, but playlist navigation is not lost.

**What works today, and what breaks the rules**

`PlayerManager` already freezes the queue when the page of the active player is left, keeps its controllers alive, and replaces the queue only when a player outside it starts (`requestPlay`) or the dock is closed. Three cases break the rules above:

| # | Case | Today | Wanted |
|---|---|---|---|
| 1 | The new page has a widget with the same track (`/audio/` → singer page, playlist → song page) | Handover in `register`: the new widget adopts the adapter, `releaseDetached()` drops the playlist, the queue becomes the new page's list. On a song page the adopting controller has `autoAdvance = false`, so playback stops after the track. | The widget shows the track as active, the playlist stays. |
| 2 | Dock title click after case 1 | `originPath` is now the new page, so the title scrolls to the widget there. | Navigate to the initial page. |
| 3 | Return to the initial `/audio` page after the sort changed elsewhere, or with shuffle | `Playlist` renders with the current `sessionStorage` sort; shuffle is reshuffled on every mount. The active widget is connected again, so `emit` rebuilds the queue from the new DOM order: prev/next silently change. | The page comes back in the sort (and the exact shuffle) the playlist was started with. |

**Approach: mirror instead of handover**

The playing controller always stays the one from the initial page. A widget on another page with the same track does not take playback over. It *mirrors* the active controller: shows its state, and its button toggles it.

```
initial page (left)                         page shown now
queue: [A, B, C]  active = B   ◄─ mirrors ─ PlayerWidget(url of B)   own controller stays idle
       kept alive, no widgets               toggle → B.toggle()
```

Consequences, all wanted:

- `active.element` stays disconnected on other pages, so the existing rule "queue is rebuilt from DOM order only while the active widget is connected" keeps the playlist frozen with no new condition.
- `active.originPath` stays the initial page, so `PlayerDock.showInline` already navigates there (case 2 needs no dock change).
- The playing controller keeps its own `autoAdvance`, so a playlist keeps advancing while a song page is shown.
- When the playlist advances, the mirror follows by URL: the old row turns idle, a row with the new track (if the page has one) turns active.
- `PlayerController.adoptFrom` and the `binding` indirection are no longer needed and are removed.

**Steps**

1. `other/player/PlayerManager.ts`
   - `register`: remove the handover branch (only `controllers.add` + `queueEmit`).
   - Add `getShown(controller)`: returns `active` when `active !== controller`, `active.originPath !== controller.originPath` and `active.source.url === controller.source.url`; otherwise `controller`.
   - Add `getActiveOnPage()`: `active` when its widget is connected or some registered controller mirrors it; otherwise `null`.
   - The queue is taken when the user starts a track (`takeQueue` in `requestPlay`), not rebuilt on every emit. Next, previous and auto-advance go through `move` and do not take it again; resume does not either. `refresh()` takes it again only while the active widget is connected, so a sort change reorders the playlist on its own page and never from another page.
   - Add a playlist view: pages report their state with `setPageView(path, view: unknown)`; `takeQueue` copies it; `getPlaylistView(originPath)` returns it only for the active controller's `originPath`. Clear it where the queue is released (`releaseDetached`). The manager does not know what the view contains.
   - Update the class comment: the queue is released on dock close or when a player outside it starts, not on a same-track page.
2. `other/player/PlayerController.ts`: delete `adoptFrom` and `binding`; adapter events call `this` again.
3. `other/player/usePlayer.ts`: subscribe to the manager for `shown = playerManager.getShown(controller)`. Take `snapshot` from `shown`, `isActive = active === shown`, and return `shown` as `controller`, so `PlayerWidget` toggles the playing track. Register/unregister, `setElement` and `setTitle` keep using the widget's own controller. `PlayerWidget.tsx` needs no change.
4. `components/player/PlayerSyncToggle.tsx`: `getActive` returns `playerManager.getActiveOnPage()`. On a page that mirrors the track the header button pauses/resumes it and no longer calls `playFirst()`.
5. `components/audio/Playlist.tsx` (case 3)
   - Read the page path from `PagePathContext`.
   - Initial state: `view = playerManager.getPlaylistView(path)` as `{ sort, order }` (`order` = `track.order` list as rendered). If present, start with `view.sort` and, for shuffle, build `shuffled` from `view.order` instead of a new shuffle. Otherwise behave as today (`sessionStorage`).
   - Report: in an effect on sort/order, call `playerManager.setPageView(path, { sort, order })`, then `playerManager.refresh()`.
   - A restored sort does not write `sessionStorage`; only a click on the sort control does. Keep `PlaylistSort--animated` tied to a user click, so a restored sort does not animate.
   - The view exists only inside a client session, so the static HTML and hydration stay first-line sorted as now.
6. `components/player/PlayerDock.tsx`: no code change expected. Verify `showInline` from a mirror page: navigates to `originPath`, waits for the re-acquired widget, scrolls to it.

**Behavior after the change**

| Action | Result |
|---|---|
| Play on page A | Playlist = A, in the order and sort A has at that moment. |
| Change the sort on A while A is shown | The playlist follows: prev/next use the new order, and A comes back in this sort later. |
| Navigate anywhere, use dock prev/next/seek, change sort on another playlist page | Playlist = A, unchanged. |
| Shown page has the playing track | Its row is active (seek line, pause icon); its button and the header `PlayerSyncToggle` pause/resume the track. Playlist = A. |
| Play a *different* track on page B (row click, header play, `?autoplay=1`) | Playlist = B; A's kept controllers are destroyed. |
| Dock title click | On A: scroll to the row. Elsewhere: navigate to A in its saved sort, then scroll. |
| Return to A by any way (title, Back, link) | A is shown in the sort and order it had when it was last shown, whatever was picked on other pages. |
| Dock X | Playback stops, playlist and saved view are released. Nothing is mirrored any more. |
| Dock X, then play the same track on page B | Playlist = B, the track starts from 0. It is a new start like any other. |

**Docs**

- `.github/instructions/player-widget.instructions.md`: replace the "Handover" bullet with the mirror rule; add `getShown`, `getActiveOnPage`, the playlist view slot; update `usePlayer`, `PlayerSyncToggle` and the `PlayerController` bullet (no `adoptFrom`).
- `.github/instructions/audio-pages.instructions.md`: `PlaylistSort` bullet — the sort and shuffle order of the playing playlist are restored when its page is shown again.
- `todo.md`: remove the "player title click - where to return?" item.

**Tests**

- `tests/client/other/player/PlayerManager.test.ts`
  - Replace "continues the track in the widget of the same track on the new page" with: a same-track widget on another page mirrors the active player; queue, `hasPrev`/`hasNext` and `originPath` do not change; "next" plays the next track of the initial page.
  - `getShown`: same URL on the same page is not a mirror; the mirror moves after "next".
  - `getActiveOnPage`: connected, mirrored, neither.
  - Playing a different player on the new page replaces the playlist and destroys the kept controllers.
  - After the dock is closed, the same track played on another page starts a new playlist of that page.
  - The playlist view is kept only for the origin path and cleared on dock close and on playlist change.
- `tests/client/other/player/PlayerController.test.ts`: remove the `adoptFrom` tests.
- `tests/client/other/player/usePlayer.test.ts`: a widget on another page with the playing track returns the playing controller, its snapshot and `isActive = true`; its own controller is never started.
- `tests/ui/components/player/PlayerSyncToggle.test.tsx`: on a mirror page it shows pause and toggles the track; without a mirror it calls `playFirst`.
- `tests/ui/components/player/PlayerDock.test.tsx`: from a mirror page the title navigates to the initial page.
- `tests/ui/components/audio/Playlist.test.tsx`: remount as the playlist origin restores the title sort and the exact shuffle order even when `sessionStorage` holds another sort; a page that is not the origin still follows `sessionStorage`.
- `tests/e2e/player.spec.ts`: play track 2 on a singer page in title sort → open the song of that track (row is active) → dock "next" plays track 3 of the singer page → switch sort on another singer page → dock title returns to the first singer page in title sort with the playing row in view.
- Run `pnpm run type-check`, `pnpm run lint`, `pnpm test`, then `pnpm run test:build` and `pnpm run test:e2e`.

**Decisions**

- A mirror row is only another view of the playing track. Pause and resume from it, also when the track is paused, never reset the initial playlist. Only a different track switches it.
- `?autoplay=1` and the header play button (when the page does not show the playing track) count as a manual start and switch the playlist.
- The saved view lives in memory with the playlist, not in `sessionStorage`: it ends with the dock or a page reload, like the playlist itself.
- A playlist started on a song page (`autoAdvance = false`) also stays when a singer page is opened: it does not start advancing through the singer's list until the user plays a different track there.
