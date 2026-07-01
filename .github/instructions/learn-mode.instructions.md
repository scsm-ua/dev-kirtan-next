---
description: "Use when modifying the song Learn mode: the per-word translation view (LearnVerse), the word-by-word parser/tokenizer in components/song/Verse/helpers.tsx, the wbw mode controls in SongText, the server-side derivation in lib/song.ts, or the SONG_WBW_MODE preference."
applyTo: ["components/song/Verse/LearnVerse.tsx", "components/song/Verse/LearnVerse.scss", "components/song/Verse/Verse.tsx", "components/song/Verse/helpers.tsx", "components/song/SongText/SongText.tsx", "components/common/DisplayModeMenu/**", "lib/song.ts", "other/userPreferrences.ts", "types/song.ts"]
---

# Song Learn Mode Architecture

Learn mode is an alternate render of a verse that pairs each source-text token with its `word_by_word` translation as columnar pairs. It is one of three values of the **word-by-word mode** (`TWbwMode = 'hide' | 'inline' | 'classical'`, with named constants in `WBW_MODE`), which is **orthogonal** to the **view mode** (`TViewMode = 'all' | 'verse' | 'translation'`).

## Server-side derivation (`lib/song.ts`)

`getSongBySlug` enriches the raw song JSON before sending it to the client. None of these fields exist on disk; they are computed once per request and consumed read-only by the client:

| Field | On | Meaning |
|---|---|---|
| `song.hasWbw` | `TSong` | At least one verse has a non-empty `word_by_word` array. |
| `song.fullInlineWbw` | `TSong` | `hasWbw` AND **every** wbw-bearing verse qualifies for inline mode (`isWbwInlineModeAvailable === true`). Gate for the Learn UI. |
| `song.hasVersesText` | `TSong` | At least one verse has non-empty `text`. |
| `song.hasVersesTranslations` | `TSong` | At least one verse has non-empty `translation`. Drives `hasTranslation` everywhere downstream (replaces the old `meta.translation === 'no'` check). |
| `verse.isWbwInlineModeAvailable` | `TVerse` | Per-verse: every parsed wbw entry is single-key and that key appears as a token in this verse's `text`. |
| `verse.inline_word_by_word` | `TVerse` | Pre-built `TInlineWbwEntry[][]` from `buildInlineWordByWord(verse.text, verse.word_by_word)`. Set only when the verse has `word_by_word`. |

The client never calls `buildInlineWordByWord` / `parseWordByWord` / `tokenizeLine` directly — those helpers run on the server and the result rides on the verse object. Keep the helpers pure (no DOM, no React) so they stay safe to import from `lib/song.ts` in a Node context.

## Toggle & State

| Concern | Location |
|---|---|
| Persistence | `getSongWbwMode` / `setSongWbwMode` in `other/userPreferrences.ts` (localStorage key `SONG_WBW_MODE`, values `'hide' \| 'inline' \| 'classical'`, default `WBW_MODE.INLINE`). Invalid stored values fall back to the default. |
| Local state | `wbwMode` in `components/song/SongText/SongText.tsx`, hydrated from storage inside `useEffect` (SSR-safe). Default before hydration is `WBW_MODE.INLINE`. |
| Debug override | `forceInline` boolean in `SongText`. Set by the `kirtan:setWbwMode` event handler when `INLINE` is requested on a song where `fullInlineWbw` is false — renders the LearnVerse anyway with stub `'-'` translations, and also keeps the classical block visible so the source data is inspectable. Cleared on any explicit `handleWbwModeChange`. |
| UI control | Second radio group inside `<DisplayModeMenu>` (`components/common/DisplayModeMenu/`), rendered next to the view-mode group. The wbw group is only shown when `hasWbw` is true; the INLINE option in the menu is gated by `fullInlineWbw`. |
| Quick-toggle buttons | `SongText__btnGroup` next to the menu trigger: a **Learn** button (toggles INLINE ↔ HIDE plus `mode = ALL`) shown when `hasWbw && isCompact`, and a **Compact** button (toggles between ALL+INLINE and VERSE+HIDE) shown when `hasWbw && (isLearn || !isCompact)`. Both delegate to the same `handleViewModeChange` / `handleWbwModeChange` setters. |
| Toggle bar visibility | The entire `SongText__toggle` strip renders only when `hasVersesText && (hasVersesTranslations || hasWbw)` — songs with no text or with text-only-no-translation-no-wbw show no header. |
| Hotkey bridge | `SongText` listens on `window` for `kirtan:setMode` and `kirtan:setWbwMode` custom events (`CustomEvent<{ mode }>` / `CustomEvent<{ wbwMode }>`). The `useGlobalHotkeys` hook dispatches them; do not call SongText setters directly from outside. |

### `effectiveMode` and `effectiveWbwMode` (SongText)

Both are derived per render so individual songs/verses can override the user's chosen modes:

- `allowInline = song.fullInlineWbw || forceInline` — controls whether the LearnVerse component is ever mounted.
- `effectiveMode`: collapses `TRANSLATION`/`ALL` to `VERSE` when `!hasVersesTranslations`. Translation-only songs cannot land in a translation view.
- `effectiveWbwMode`:
  1. If `!hasWbw` → `HIDE` (no other mode is meaningful).
  2. If `effectiveMode === VERSE` and current is `CLASSICAL` and `allowInline` → upgrade to `INLINE`. In verses-only mode the classical block has no translation row to anchor against, so inline (when available) is the only useful learn rendering.
  3. If `INLINE` but `!allowInline` → fall back to `CLASSICAL`. Inline is meaningless without learn data.

### `Verse` behaviour by wbw mode

`Verse` receives `hasWbw`, `fullInlineWbw`, `forceInline`, and the song-level `wbwMode`. It computes its own per-verse `verseHasInline = !!inline_word_by_word` and `isLearn = fullInlineWbw && wbwMode === INLINE && verseHasInline`, then:

- `WBW_MODE.INLINE` + verse has inline data → `<LearnVerse>` is open; the plain `<VerseText>` is collapsed; the `<VerseWbw>` classical block is hidden.
- `WBW_MODE.INLINE` + verse lacks inline data (`!verseHasInline`) → per-verse fallback: `<VerseText>` stays open and `<VerseWbw>` block is shown. Songs where any wbw-bearing verse is non-inlinable can still mix-and-match this way.
- `WBW_MODE.INLINE` + `forceInline` debug flag → the classical `<VerseWbw>` block is shown **in addition to** the LearnVerse so the (correct) source data is visible next to the potentially broken inline rendering.
- `WBW_MODE.CLASSICAL` → `<VerseText>` open + `<VerseWbw>` block open, independent of view mode.
- `WBW_MODE.HIDE` → `<VerseText>` open; no classical block.

The translation block (`<VerseTranslation>`) is controlled exclusively by `showTranslation = mode === TRANSLATION || mode === ALL` and is independent of wbw mode.

## Data Pipeline (`helpers.tsx`)

Pure functions, called server-side from `lib/song.ts`:

```
verse.text[]            verse.word_by_word[]
      │                          │
      ▼                          ▼
 tokenizeLine()           parseWordByWord()
      │                          │
      └────────┬─────────────────┘
               ▼
       buildInlineWordByWord()        wbwInlineModeAvailable()
               │                              │
               ▼                              ▼
   verse.inline_word_by_word          verse.isWbwInlineModeAvailable
   (TInlineWbwEntry[][])              (boolean, also aggregated into
                                       song.fullInlineWbw)
```

### Separator class (single source of truth)

```ts
const SEP_CHARS = '\\s,.\\-!?:;()\\[\\]';
```

Used by `tokenizeLine` (text side) **and** `parseWordByWord` (key side). If you change it, both sides change in lockstep — never split text and keys by different rules or alignment breaks.

### `tokenizeLine(line)` → `{ pre, word, sep }[]`

- Strips HTML tags and leading indent.
- `word` = run of non-separator chars. `sep` = the run of separators that followed it.
- `pre` = run of separators **preceding** the word. Non-empty only on the first token (e.g. opening `(` before the line's first word); kept on every token for shape symmetry.
- Invariant: `tokens.map(t => t.pre + t.word + t.sep).join('') === stripped(line)`. Anything that breaks this invariant will desync display from source.

### `parseWordByWord(lines)` → `TWbwEntry[]`

Regex: `/\*\*([^*]+?)\*\*\s*[\u2014\u2013-]\s*([\s\S]+?)(?=\s*\*\*|\s*$)/g`

Supports both known formats — do not introduce a second parser:

| Format | Example |
|---|---|
| Semicolon-separated | `**a b** — t1; **c** — t2.` |
| Whitespace-only (entries delimited solely by `**`) | `**a**–t1 **c**–t2` |

Dash may be `-`, `–` (U+2013), or `—` (U+2014). The translation captures everything up to the next `**` or end of string, so prose between entries (e.g. `[você é]`) gets attached to the preceding translation — that is intentional, not a bug.

Trailing trim strips only `\s` and entry-separator punctuation (`,;.`); brackets `)` / `]` are **left intact** so balanced content like `"material senses (jada indriya)"` survives. Keys split with the same `SEP_CHARS` class, so `śrī-gaura` becomes 2 tokens and aligns with `śrī gaura` (or `śrī-gaura`) in the text.

### `buildInlineWordByWord(text, wordByWord)` → `TInlineWbwEntry[][]`

**Strictly sequential, no fuzzy matching, no lookahead.** Walks tokens in order; for each dict entry, consumes `entry.key.length` text tokens and emits one `TInlineWbwEntry { text, trans, sep, error? }`. The cursor persists **across text lines** because `word_by_word` is verse-wide, not line-scoped.

- Each group's `text` keeps internal seps attached (`first.pre + slice[0..n-2].map(t => t.word + t.sep).join('') + lastWord`); the **trailing sep is split off into `sep`** so the original separator (space / hyphen / comma / bracket / multi-space indent) can be rendered verbatim between pairs. The first slice's `pre` is prepended so leading punctuation (e.g. `(`) survives. `sep` is stored as-is — the renderer converts whitespace runs to NBSPs.
- If dict runs out before text does, remaining tokens get `trans: '-'` and `error: 'mismatch'`.
- Per-entry diagnostics tag misalignments inline so they show up visually in the rendered pair (highlight modifiers):
  - `error: 'mismatch'` — dict ran out, or `entry.key[0]` doesn't equal the slice's first word.
  - `error: 'multi'` — dict entry has a multi-word key. Inline mode only renders cleanly with 1:1 keys; multi-key entries are still emitted but flagged so authors can fix the source.

Mismatches are intentional dead-ends: if `text` and `word_by_word` aren't 1-to-1 token-count-aligned, columns will drift from that point. Fix the source data — do not add lookahead/fuzzy logic here.

### `wbwInlineModeAvailable(text, wordByWord)` → `boolean`

Same checks as `buildInlineWordByWord`'s error classification, but as a pre-flight predicate: returns `false` if any parsed entry has `key.length !== 1`, or if any entry's key word is absent from the verse's text tokens. Result is stored on `verse.isWbwInlineModeAvailable` and aggregated into `song.fullInlineWbw`.

## Render Layout (`LearnVerse.tsx` + `.scss`)

```
┌─────────┐ ┌──────────────┐ ┌──────┐
│ word/ph │ │ longer word  │ │ word │   ← .LearnVerse__word  (bold, top)
│ trans   │ │ trans phrase │ │  -   │   ← .LearnVerse__trans (mid-gray, bottom)
└─────────┘ └──────────────┘ └──────┘
```

- `.LearnVerse__line` is a plain block (not flex) with `padding-left: 0.5em; text-indent: -0.5em;`. This is a **hanging indent** — first line flush at the level set by `__indent--N` (`margin-left`), wrapped continuation lines pushed 0.5em further right so a wrap stays visually distinct from a real next indent level (which is a full `1em` step). Mirrors the same trick in `VerseText`; do not switch back to a flex line or `text-indent` is ignored.
- `.LearnVerse__pair` is `display: inline-flex; flex-direction: column; vertical-align: top; text-indent: 0` — pairs flow inline so they wrap naturally with the surrounding line, while internally stacking word over translation. `text-indent: 0` prevents the negative indent from re-applying inside each pair.
- Inter-pair spacing on the **word row** comes from the original `sep` rendered after each word (space / `-` / `,` / multi-space indents). Whitespace chars in `sep` must be rendered as **NBSP (`\u00A0`)** — plain spaces inside the word span are trailing whitespace of a flex-item block and get collapsed to zero width. Multi-space runs (the `    ` indents that VerseText renders as `Verse__space`) are preserved by converting each whitespace char individually. Inter-pair spacing on the **translation row** is `margin-right` on `.LearnVerse__trans` (translations would otherwise butt up against the next pair when the separator is a hyphen with no space).
- `.LearnVerse__trans--missing` styles the literal `'-'` for unmatched tokens (uses `--dark` so it reads as a real value rather than greyed out).
- `.LearnVerse__trans--error-multi` (yellow `#fff3bf`) and `.LearnVerse__trans--error-mismatch` (red `#ffd6d6`) visualise the per-entry `error` tag from `buildInlineWordByWord` so source-data bugs are spotted immediately in dev.
- `renderTrans(trans)` in `LearnVerse.tsx` splits on ` (` (space followed by `(`) and inserts a `<br/>` so a parenthesised qualifier sits on its own visual row under the main translation. Bare `(of Orissa)` or `word(x)` (no space) stay on one line.
- Responsive: below `v.$bp576` the whole `.LearnVerse` block scales to `font-size: 14px` (default is the inherited 16px). Words and translations inherit it together so the pair columns stay aligned.

## Light-text rules (parity with `VerseText`)

`LearnVerse` mirrors VerseText's `meta` handling for visual consistency:

- `meta['verse parentheses'] === 'non bold'` → words containing `(` or `)` get `LearnVerse__word--light`.
- `meta['inline verse'] === 'non bold' && !hasNumber` → all words light.
- Empty-line detection delegates to `getLineContent(line, meta, hasNumber)` (same rule as VerseText) so blank lines render `<br/>` identically across modes.

## Adding new behaviour — checklist

1. Need a new separator (e.g. `;`)? Update `SEP_CHARS` only — both `tokenizeLine` and `parseWordByWord` pick it up.
2. Need a different word_by_word format? Extend `parseWordByWord`'s regex; do not add a second parser. If alignment rules change, update `wbwInlineModeAvailable` in lockstep so server-side `fullInlineWbw` stays accurate.
3. Adding a new derived song flag? Compute it once in `getSongBySlug` (`lib/song.ts`) alongside `hasWbw`/`fullInlineWbw`, declare it on `TSong` in `types/song.ts`, and consume it from `SongText`. Do not recompute on the client.
4. Adding a new visual error class? Emit the tag from `buildInlineWordByWord` as `error: '<name>'` and style `.LearnVerse__trans--error-<name>` — the renderer already maps `error-${error}` to the class.
5. Need to change column visuals? Edit `.LearnVerse__pair` / `.LearnVerse__line`; do not switch the line back to flex — the hanging-indent for wrapped lines depends on `text-indent` working on a block.
6. Adding a hotkey-driven mode switch? Dispatch a `kirtan:setMode` or `kirtan:setWbwMode` `CustomEvent` from the hotkey hook — do not import SongText's setters directly.
7. Adding props to `LearnVerse` that mirror `VerseText` (e.g. `meta`, `hasNumber`) — keep prop names identical so future shared logic stays trivial.
