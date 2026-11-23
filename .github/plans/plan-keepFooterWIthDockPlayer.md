## Plan: Keep the Footer Reachable While the Dock Player Is Active

Today the dock (`PlayerDock`, `position: fixed; bottom: 0`) sits on top of the bottom footer for as long as something plays, so the footer navigation (Books / Contents / Index / Search) is unreachable. Goal: in **bottom-footer mode only**, the footer becomes the last element of the page while the dock is active. The user scrolls to the very bottom and sees the footer directly above the dock. Sidebar mode (footer is the left bar, dock starts at its right edge) does not change.

```
no dock (unchanged)        dock active, mid-page        dock active, scrolled to bottom
┌──────────────┐           ┌──────────────┐             ┌──────────────┐
│ content      │           │ content      │             │ …end of text │
│              │           │              │             │ FOOTER       │
│ FOOTER       │           │ DOCK         │             │ DOCK         │
└──────────────┘           └──────────────┘             └──────────────┘
```

**Approach: CSS only, one DOM move**

The footer is a sibling *below* the scroll container (`.Layout__content`), so it cannot scroll with the content. Move `<Footer>` inside `.Layout__content` (after `<main>`) and choose its positioning by mode:

| Mode | Footer | Scroller (`.Layout__content`) |
|---|---|---|
| bottom, no dock | `position: fixed; left/right/bottom: 0` — same pixels as today | `height: calc(100% - var(--footer-height))` (unchanged) |
| bottom, dock active | `position: static` — in flow, last element of the page | `height: 100%`, `padding-bottom: var(--player-dock-height)` |
| sidebar (any) | `position: fixed` left bar (rule already exists) | unchanged: `height: 100%`, existing dock padding |

No JS, no scroll listener, the scroll container stays the same element (router scroll restore, hotkeys, `scrollToInline`, e2e selectors keep working), and the footer moves with the scroll natively.

**Steps**

1. `components/common/Layout/LayoutChrome.tsx`: move `<Footer bookId={bookId} page={page} />` inside `div.Layout__content`, after `</main>`. DOM order header → main → footer stays, so tab order and landmarks do not change.
2. `components/common/Footer/Footer.scss`:
   - base (bottom mode): add `position: fixed; left: 0; right: 0; bottom: 0; z-index: 10`. The fixed footer fills the strip below the scroller exactly as the static one does now.
   - `.has-player-dock &` → `position: static`, wrapped so it applies only outside sidebar mode. `mixins.scss` has only `sidebar-mode`; add a `bottom-footer-mode` mixin (`@media not all and #{v.$sidebar-media}`-style negation, or put the dock rule first and let the existing `sidebar-mode` block override it — pick the one that compiles cleanly with the comma-separated `$sidebar-media` list; the override order is the simpler option).
3. `components/common/Layout/Layout.scss`, inside `.has-player-dock &` for bottom mode:
   - `height: 100%` (the footer no longer needs a strip below the scroller; the dock covers that area, dock height 100/124px ≥ footer 64px),
   - `padding-bottom: var(--player-dock-height)`.
   - Sidebar mode keeps the current `max(0px, calc(var(--player-dock-height) - var(--footer-height)))`, which already resolves to the full dock height there. Result: one rule, `padding-bottom: var(--player-dock-height)`, for both modes; update the comment ("Dock covers the bottom footer…" is no longer true).
4. `styles/common.scss` `.Main`: `min-height: calc(100% - var(--header-height))` makes header + main fill the scroller, so with a dock a short page would always scroll by footer + dock height. In dock + bottom mode reduce it by the footer and the dock padding, so on a short page the footer sits directly above the dock without scrolling. Check how the percentage resolves against the padded scroller (`box-sizing`) before fixing the formula.
5. `components/analyze/AnalyzeTable.scss`: `.Layout:has(.Analyze) .Footer { display: none }` still matches (footer is still under `.Layout`). Verify only.
6. `app/test/player/PlayerTestPage.scss`: check its own `.has-player-dock` padding does not double up with the new layout padding.

**Docs**

- `.github/instructions/player-widget.instructions.md` → "Dock layout contract": new padding rule, footer is in flow above the dock in bottom mode.
- `.github/instructions/app-architecture.instructions.md` (line ~96, `LayoutChrome` description) and `global-hotkeys.instructions.md` (scroll container section): footer now lives inside `.Layout__content`.
- `.github/plans/plan-bottomDockPlayer.md`: note under "Further Considerations" item 2 that this plan replaces "dock hides footer navigation entirely".

**Tests**

- `tests/ui/components/common/Layout/LayoutChrome.test.tsx` (new, jsdom): `.Footer` is a descendant of `.Layout__content` and comes after `main`.
- `tests/e2e/player.spec.ts` (CSS behavior needs a real browser):
  1. bottom mode (e.g. 390×844), no dock: footer bounding box is at the viewport bottom (regression guard for the fixed positioning).
  2. start playback, stay at top: footer is not visible above the dock.
  3. scroll `.Layout__content` to the bottom: footer is visible, `footer.bottom <= dock.top` (±1px), footer links are clickable, and the last content line is above the footer.
  4. short page with dock: footer sits directly above the dock, no scroll needed.
  5. sidebar mode (e.g. 1280×720) with dock: footer is still the left bar, dock starts at `--sidebar-width`.
  6. close the dock (X): footer is back at the viewport bottom, scroll position is kept.
- Existing: `navigation.spec.ts` / `sections.spec.ts` (scroll restore), `swipe.spec.ts`, `tests/ui/.../Footer.test.tsx`, `AppRoot.test.tsx`.
- Run: `pnpm run type-check`, `pnpm run lint`, `pnpm test`, then `pnpm run test:build` and `pnpm run test:e2e`.

**Manual checks**

- iOS Safari: safe-area inset under the dock, rubber-band scroll at the bottom, footer taps.
- Android Chrome with a collapsing URL bar (`100dvh`): fixed footer stays glued to the bottom without a dock.
- Desktop tall window (bottom mode, classic scrollbars): scrollbar ends above the footer without a dock, as today.
- Analyze page, export page, `/test/player/`, root page `/` with `data-root-pending`.
- Print preview: footer and dock as before.

**Decisions**

- Footer is revealed by natural scroll (last element of the page), not by a slide-in animation. Needs no JS and cannot jitter on iOS, where scroll events lag behind the scroll.
- Without a dock nothing changes visually; the footer only changes from static-below-scroller to fixed-at-bottom.
- Sidebar mode is out of scope.

**Known trade-offs**

1. When playback starts, the footer switches from fixed to in-flow in one frame while the dock slides in over 250 ms, so the 64px strip can show page background for a moment. If it is visible in practice, delay the switch with a transition on the dock class or keep the footer fixed until the dock's `transitionend`.
2. With a dock, every page is 64px (footer) longer than its content. This is the intended behavior.

**Rejected alternatives**

- Keep the footer outside the scroller and slide it up with an `IntersectionObserver` "at bottom" flag: needs JS state, an extra sentinel node and is an animation rather than scroll-linked.
- Make `.Layout` the scroll container while the dock is active: the scroll element would change at play/close, which resets the scroll position and breaks the router, hotkeys and tests that target `.Layout__content`.
- CSS scroll-driven animations (`animation-timeline: scroll()`): not supported in Firefox and older Safari.
