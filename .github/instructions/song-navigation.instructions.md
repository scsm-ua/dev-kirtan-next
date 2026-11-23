---
description: "Use when modifying prev/next song navigation, touch-swipe nav, keyboard hotkeys for song navigation, the SwipeNav indicator circle, animations in components/song/PrevNextNav, or wiring hotkey events from useGlobalHotkeys to song-page components."
applyTo: ["components/song/PrevNextNav/**", "other/hooks/useGlobalHotkeys.ts"]
---

# Song Navigation (Prev/Next) Architecture

The prev/next song flow has **three independent input sources** that all converge on the same animated indicator circle and ultimately a client-side navigation (`navigate()` from `other/router/navigate.ts`, or an intercepted `<a href>`). The next song's JSON is loaded and rendered without a document reload; see `app-architecture.instructions.md`.

## Inputs → Output

| Input | Source | Triggers |
|---|---|---|
| Touch swipe | `components/song/PrevNextNav/SwipeNav.tsx` (touch listeners on `document.body`) | Immediate navigation when progress fills the ring |
| Keyboard hotkey | `other/hooks/useGlobalHotkeys.ts` dispatches `kirtan:prevSong` / `kirtan:nextSong` window events | `SwipeNav` listens, calls `navigate()` at once, then plays the circle animation once the new page is shown |
| Visible buttons | `components/song/PrevNextNav/PrevNextLink.tsx` (plain `<a href>`) | Intercepted by the app router (`useAppRouter` click listener) |

`PrevNextNav.tsx` is the container — it computes `prevNext` from `navMap` + `usePageQuery()` and passes it to both `PrevNextLink` and `SwipeNav`. **It does not listen for hotkey events** — that belongs in `SwipeNav` because the animation is owned there. Prev/next songs are prefetched by the router 1s after a song renders, so these navigations are usually instant. Never use `window.location.href` here; it would reload the document and stop the player.

## Songs Listed Twice in the Contents

`navMap` is built by `getNavItems` in `lib/song.ts`, one entry per page number the song is listed with.

- **Different pages** (`meta.page: [39, 60]`): one entry per page. The second listing has a `?p=60` URL, and each entry has the neighbours of its own listing.
- **The same page** (a block of songs repeated in another contents group): the song has one URL and one entry. Navigation walks the contents without the earlier listings (`getNavSongs`), so only the last listing counts. Prev and next then give the same walk in both directions.

The build (`scripts/transformContents.js`, `findSplitDuplicates`) warns when a skipped listing is not directly followed by its repeat: a reader would not reach the song at its first place. The fix is in the songbook: give the listings different page numbers.

## Hotkey Bindings (in `useGlobalHotkeys.ts`)

| Keys | Event dispatched |
|---|---|
| `,` `[` `-` `ArrowLeft` | `kirtan:prevSong` |
| `.` `]` `=` `ArrowRight` | `kirtan:nextSong` |

`ArrowLeft` / `ArrowRight` must call `e.preventDefault()` to suppress the browser's horizontal scroll.

## Direction Semantics (easy to get wrong)

Inside `SwipeNav`:

- `direction === 'left'`  → user is dragging finger leftward → reveals the **next** song (circle enters from the **right** edge)
- `direction === 'right'` → user is dragging finger rightward → reveals the **previous** song (circle enters from the **left** edge)
- `onLeftEdge = (direction === 'right')` — the variable names refer to which screen edge the circle sits on, not the direction of travel.

Use the helpers — do not re-derive:

- `pickTarget(prevNext, direction)` → returns the correct `prev` or `next` `TNavItem`
- `restingLeft(onLeftEdge)` → the X position the circle settles at when fully revealed
- `arrowCls(flip)` → arrow icon className (chevron points right by default, flipped on the left edge)
- `flyOut(el, direction)` → drives the exit transition

## Animation Timing (hotkey flow)

The hotkey flow navigates **first** and animates **after**: `keyNavigate()` subscribes with `onLocationChange()` (`other/router/location.ts`), calls `navigate()`, and plays the circle when the router fires `notifyLocationChange()`, which happens in the router's layout effect once the new page is committed. So the animation runs over the new song and never delays navigation. If the page hasn't switched within `KEY_SWITCH_TIMEOUT_MS` (a full document load, or a failed load), no animation plays. A new key press cancels a pending one.

All timings are named constants at the top of `SwipeNav.tsx`:

| Constant | Meaning |
|---|---|
| `KEY_ENTER_MS` | Hotkey: fade in while drifting to the resting spot |
| `KEY_HOLD_MS` | Hotkey: pause at the resting spot |
| `KEY_EXIT_MS` | Hotkey: fade out while drifting on |
| `KEY_SHIFT` | Hotkey: px of drift in each phase (toward the screen center) |
| `KEY_PANEL_GAP` (16) | Hotkey: gap between the white content panel (`.SongText`) and the circle. Falls back to the swipe resting spot when the panel is missing or there is no room beside it |
| `KEY_SWITCH_TIMEOUT_MS` (3000) | Hotkey: give up on the animation if the page hasn't switched |
| `EXIT_DURATION_MS` (400) | Swipe: fly-off duration |

For the swipe flow, **navigation fires together with `flyOut`**, not after it. The exit animation is cosmetic cover while the next page loads. Do not wrap navigation in `setTimeout(..., EXIT_DURATION_MS)` "to let the animation finish" — that adds 400ms to every navigation.

## The Two Circles

1. **Swipe circle** is rendered by `SwipeNav` only while a swipe is active (`{direction && swipeTarget && ...}`). It is driven by React state (`progress`, `direction`) while the finger drags.
2. **Keyboard circle** is a single element that `getKeyCircle()` creates lazily and appends to `<body>`, outside React. It is driven imperatively by `playKeyAnimation()`. It lives outside React so that it outlives the song view that the navigation replaces.

Both use the `.SwipeNav` styles and `SHARED_STYLE`. The keyboard circle writes the `<NavRing>` SVG markup by hand.

## Hooks-Rules Gotcha

`PrevNextNav.tsx` has an early `return null` when `pageQuery` is not a string. Any new `useEffect`/`useState` calls must be placed **above** that return, or React will throw "change in the order of Hooks called."

## Static Export Compatibility

`next.config.ts` uses `output: 'export'` (fully static). All navigation code is `'use client'` and uses browser APIs (`window`, `localStorage`, `CustomEvent`, `requestAnimationFrame`) — never add server-side logic to this subsystem. Song views remount per page (keyed by path), so `SwipeNav` state resets on each navigation; read the current `?p=` via `usePageQuery()` (backed by `useAppLocation`), not `window.location` during render.
