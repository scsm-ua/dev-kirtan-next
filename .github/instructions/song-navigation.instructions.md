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
| Keyboard hotkey | `other/hooks/useGlobalHotkeys.ts` dispatches `kirtan:prevSong` / `kirtan:nextSong` window events | `SwipeNav` listens, plays a synthetic slide-in animation, then calls `navigate()` |
| Visible buttons | `components/song/PrevNextNav/PrevNextLink.tsx` (plain `<a href>`) | Intercepted by the app router (`useAppRouter` click listener) |

`PrevNextNav.tsx` is the container — it computes `prevNext` from `navMap` + `usePageQuery()` and passes it to both `PrevNextLink` and `SwipeNav`. **It does not listen for hotkey events** — that belongs in `SwipeNav` because the animation is owned there. Prev/next songs are prefetched by the router 1s after a song renders, so these navigations are usually instant. Never use `window.location.href` here; it would reload the document and stop the player.

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

All timings are named constants at the top of `SwipeNav.tsx`. If you change one of these, prefer adjusting the constant over inlining a different number:

| Constant | Meaning |
|---|---|
| `ENTER_DURATION_MS` (220) | Slide-in duration. **Must match** the `left` value in the entry transition string |
| `HOLD_MS` (60) | Brief pause at peak so the user perceives the filled circle |
| `EXIT_DURATION_MS` (400) | Fly-off duration. Mostly cosmetic — see below |

**Navigation fires together with `flyOut`**, not after it. The exit animation is cosmetic cover while the next page loads; since the next song is usually prefetched it often appears at once and the animation is cut short, which is the desired tradeoff (no perceived latency penalty). Do not wrap navigation in `setTimeout(..., EXIT_DURATION_MS)` "to let the animation finish" — that adds 400ms to every navigation.

## The Two Circles

`SwipeNav` renders **two** indicator `<div>`s:

1. **Swipe circle** — conditionally rendered (`{direction && swipeTarget && ...}`), driven by React state (`progress`, `direction`), used during finger drag
2. **Keyboard circle** — always mounted, hidden by `opacity: 0`, driven imperatively via `keyCircleRef` / `keyArrowRef`. Always mounted so `requestAnimationFrame` has a painted element to animate from

Both share `SHARED_STYLE` (CSS custom properties) and the `<NavRing>` SVG component.

## Hooks-Rules Gotcha

`PrevNextNav.tsx` has an early `return null` when `pageQuery` is not a string. Any new `useEffect`/`useState` calls must be placed **above** that return, or React will throw "change in the order of Hooks called."

## Static Export Compatibility

`next.config.ts` uses `output: 'export'` (fully static). All navigation code is `'use client'` and uses browser APIs (`window`, `localStorage`, `CustomEvent`, `requestAnimationFrame`) — never add server-side logic to this subsystem. Song views remount per page (keyed by path), so `SwipeNav` state resets on each navigation; read the current `?p=` via `usePageQuery()` (backed by `useAppLocation`), not `window.location` during render.
