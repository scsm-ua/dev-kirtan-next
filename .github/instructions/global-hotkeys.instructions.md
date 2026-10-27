---
description: "Use when adding or modifying global keyboard hotkeys, the hotkeys help modal, the useGlobalHotkeys hook, or any feature that responds to keypresses outside an input field. Also covers the kirtan:* custom event bus used to bridge hotkeys to feature components."
applyTo: ["other/hooks/useGlobalHotkeys.ts", "components/common/GlobalHotkeys/**"]
---

# Global Hotkeys

The app has a single global keyboard listener that maps keys to either direct navigation (`router.push`) or to `window.dispatchEvent(new CustomEvent('kirtan:*'))`. Feature components subscribe to those events.

## Architecture

```
useGlobalHotkeys (hook)  ──► router.push(...)            // direct navigation
                         └─► window.dispatchEvent(...)   // custom events
                                       │
                                       ▼
                       feature component listens via window.addEventListener
                       (SongText, OtherTranslations, SwipeNav, GlobalHotkeys itself)
```

- **Listener owner**: `other/hooks/useGlobalHotkeys.ts` — a single `keydown` listener on `window`, scoped to the `usePathname()` segments for context-aware routing.
- **Help modal owner**: `components/common/GlobalHotkeys/GlobalHotkeys.tsx` — mounts the hook + `HotkeysModal`, wired into `Layout.tsx` at the body level so it's available on every page.
- **Cheat sheet**: `components/common/GlobalHotkeys/HotkeysModal.tsx` — translated keys via `translate(bookId, ...)`. Anything without a translation key falls back to English and gets a `// TODO:` comment.

## Hotkey Map (current)

| Key | Behavior |
|---|---|
| `/` | Toggle help modal (custom event not needed — uses callback prop) |
| `b` | Navigate to `/{bookId}` (all songbooks) |
| `c` | Navigate to `/{bookId}/contents` |
| `i` | Navigate to `/{bookId}/a-z` |
| `s` | Navigate to `/{bookId}/search` |
| `Shift+A` | On authors page → `kirtan:toggleUnknownAuthors`; otherwise → `/{bookId}/authors` with the unknown-authors block shown (via `sessionStorage` flag) |
| `l` | On song page → `kirtan:toggleOtherTranslations`; otherwise → `/{bookId}` |
| `1` `2` `3` | Dispatch `kirtan:setMode` with `{ mode }` payload |
| `4` `5` `6` | Dispatch `kirtan:setWbwMode` with `{ wbwMode }` payload (hide / inline / classical) |
| `,` `[` `-` `←` | Dispatch `kirtan:prevSong` (see `song-navigation.instructions.md`) |
| `.` `]` `=` `→` | Dispatch `kirtan:nextSong` |
| `↑` `↓` `PgUp` `PgDn` `Home` `End` `Space` | **Handled natively by the browser** — no hotkey case. See "Vertical scrolling" below. |

Mode keys map to internal `TViewMode` ids (see `VIEW_MODE` in `types/common.ts`):

```
'1' → VIEW_MODE.ALL          ('all')
'2' → VIEW_MODE.VERSE        ('verse')
'3' → VIEW_MODE.TRANSLATION  ('translation')
```

The `KEY_TO_MODE` lookup in `useGlobalHotkeys` is the only place where the
user-facing digit keys are translated into view-mode ids — outside of
`ThreeModeSwitch.tsx` (which keeps its own positional '1'/'2'/'3' for CSS),
no other file should reference raw mode digits.

## Guardrails

Every handler must short-circuit on:

```ts
if (isInputFocused()) return;           // typing in <input>, <textarea>, contentEditable
if (e.metaKey || e.ctrlKey || e.altKey) return;  // never swallow browser shortcuts
if (e.defaultPrevented) return;         // an earlier listener (BookListKeyNav, OtherTranslations) already claimed this key
```

`isInputFocused()` is local to the hook. Don't bypass these checks. Single-letter keys (`b`, `c`, `s`, `l`) would break form input if these guards were missing.

The `defaultPrevented` check is what lets per-feature `document`-level listeners (which fire **before** the `window` listener) opt out of the global fallback — e.g. `BookListKeyNav` claims `ArrowUp/Down/Left/Right` on the home page, `OtherTranslations` claims `ArrowUp/Down` while its modal is open. Any new feature-scoped key handler must call `e.preventDefault()` if it wants to suppress the global default for that key.

`e.preventDefault()` is required only for:
- `/` (browser quick-find on Firefox)
- `ArrowLeft` / `ArrowRight` (horizontal scroll)

## Vertical scrolling (Arrow / PageUp / PageDown / Home / End / Space)

The app shell (`components/common/Layout/Layout.scss`) sets `body { overflow: hidden }` and makes `.Layout__content` the real scroll container (`overflow: auto`). The browser only applies its built-in scroll-key behavior when a scrollable element (or one of its descendants) is focused — so vertical-scroll keys would otherwise do nothing.

We proxy those keys to the scroller by **giving the browser a focused scroller**, not by writing scroll code:

1. `.Layout__content` is rendered with `tabIndex={-1}` (programmatically focusable, not in tab order). See `components/common/Layout/Layout.tsx`.
2. `useGlobalHotkeys` runs a `useEffect` on `pathname` change that calls `scroller.focus({ preventScroll: true })`.
3. The focus outline is suppressed via `&__content:focus { outline: none }` in `Layout.scss`.

Result: ArrowUp/Down, PageUp/Down, Home/End and Space all scroll natively without any keydown handler. No `case 'ArrowUp'` belongs in `useGlobalHotkeys` — adding one would double-scroll when the scroller is focused.

**Edge case**: if the user clicks an interactive element (`<a>`, `<button>`) inside the content, focus moves there and vertical-scroll keys stop scrolling until the next route change. This is intentional — keyboard-driven users can press `Tab` past the focused element or trigger any route change to re-focus the scroller.

## Custom Event Naming

All events use the `kirtan:` prefix. Use **camelCase** after the colon. Existing names:

- `kirtan:setMode` (carries `detail: { mode: TViewMode }`)
- `kirtan:setWbwMode` (carries `detail: { wbwMode: TWbwMode }`)
- `kirtan:toggleOtherTranslations` (no payload)
- `kirtan:prevSong` / `kirtan:nextSong` (no payload)
- `kirtan:toggleUnknownAuthors` (no payload; consumed by `components/authors/UnknownAuthors.tsx`)

When adding a new event:
1. Declare the constant inline in the `switch` case in `useGlobalHotkeys.ts`
2. Add a listener with matching cleanup in the consuming component's `useEffect`
3. Type the detail via `(e as CustomEvent<{...}>).detail`

## Toggle vs Open

Modals triggered by hotkeys must **toggle** on repeated press, not just open:

```ts
setOpen((v) => !v);   // ✓ toggle
setOpen(true);        // ✗ stale-open
```

This applies to `GlobalHotkeys` (help modal) and `OtherTranslations` (`l` key).

## Adding a New Hotkey — Checklist

1. Pick an unused single key (audit the table above)
2. Add a `case` in `useGlobalHotkeys.ts` — decide: direct `router.push` or `dispatchEvent`
3. If dispatching: add the listener in the target component (`useEffect` with cleanup)
4. Add a row to `HOTKEYS` in `HotkeysModal.tsx`. Try to use an existing translation key from `source/translations.json`. If none fits, hardcode English and add `// TODO: add <KEY> to translations.json`
5. Confirm the guards (`isInputFocused`, modifier check) still apply
6. Test in static export build — no SSR-only APIs

## Static Export Compatibility

`next.config.ts` uses `output: 'export'`. All hotkey code is `'use client'` — never import server-only modules. `router.push()` from `next/navigation` works fine because it uses the History API in the browser.
