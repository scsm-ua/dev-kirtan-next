---
description: "Use when modifying the song Learn mode: the per-word translation view (LearnVerse), the word-by-word parser/tokenizer in components/song/Verse/helpers.tsx, the Learn checkbox in SongText, or the SONG_LEARN_MODE preference."
applyTo: ["components/song/Verse/LearnVerse.tsx", "components/song/Verse/LearnVerse.scss", "components/song/Verse/helpers.tsx", "components/song/SongText/SongText.tsx", "other/userPreferrences.ts"]
---

# Song Learn Mode Architecture

Learn mode is an alternate render of a verse that pairs each source-text token with its `word_by_word` translation as columnar pairs. It's an independent toggle, **orthogonal** to the existing `TTranslationMode` (1/2/3 switch).

## Toggle & State

| Concern | Location |
|---|---|
| Persistence | `getSongLearnMode` / `setSongLearnMode` in `other/userPreferrences.ts` (localStorage key `SONG_LEARN_MODE`, `'1'` or absent) |
| Local state | `isLearn` in `components/song/SongText/SongText.tsx`, hydrated from storage inside `useEffect` (SSR-safe) |
| UI control | "Learn" checkbox in `SongText.tsx`, rendered next to `ThreeModeSwitch`. **Only shown when `isWBW`** (some verse in the song has `word_by_word` data) |
| Verse prop | `isLearn={isLearn && isWBW}` passed to each `<Verse>` — never just `isLearn` |

When `isLearn` is true, `Verse.tsx` swaps `<VerseText>` for `<LearnVerse>` **and** hides the `<VerseWbw>` block (its content is inlined into LearnVerse). The translation block and 3-mode switch keep working unchanged.

## Data Pipeline (`helpers.tsx`)

Three pure functions, run top-to-bottom:

```
verse.text[]            verse.word_by_word[]
      │                          │
      ▼                          ▼
 tokenizeLine()           parseWordByWord()
      │                          │
      └────────┬─────────────────┘
               ▼
       buildLearnLines()
               │
               ▼
      TLearnGroup[][]   ← consumed by LearnVerse
```

### Separator class (single source of truth)

```ts
const SEP_CHARS = '\\s,.\\-';
```

Used by `tokenizeLine` (text side) **and** `parseWordByWord` (key side). If you change it, both sides change in lockstep — never split text and keys by different rules or alignment breaks.

### `tokenizeLine(line)` → `{ word, sep }[]`

- Strips HTML tags and leading indent.
- `word` = run of non-separator chars. `sep` = the run of separators that followed it (may include comma/dot/hyphen).
- Invariant: `tokens.map(t => t.word + t.sep).join('') === stripped(line)`. Anything that breaks this invariant will desync display from source.

### `parseWordByWord(lines)` → `TWbwEntry[]`

Regex: `/\*\*([^*]+?)\*\*\s*[\u2014\u2013-]\s*([\s\S]+?)(?=\s*\*\*|\s*$)/g`

Supports **both** known formats — do not introduce a second parser:

| Format | Example |
|---|---|
| Semicolon-separated | `**a b** — t1; **c** — t2.` |
| Whitespace-only (entries delimited solely by `**`) | `**a**–t1 **c**–t2` |

Dash may be `-`, `–` (U+2013), or `—` (U+2014). The translation captures everything up to the next `**` or end of string, so prose between entries (e.g. `[você é]`) gets attached to the preceding translation — that is intentional, not a bug.

Keys split with the same `SEP_CHARS` class, so `śrī-gaura` becomes 2 tokens and aligns with `śrī gaura` (or `śrī-gaura`) in the text.

### `buildLearnLines(text, wordByWord)` → `TLearnGroup[][]`

**Strictly sequential, no fuzzy matching, no lookahead.** Walks tokens in order; for each dict entry, consumes `entry.key.length` text tokens and emits one `TLearnGroup { text, trans, sep }`. The cursor persists **across text lines** because `word_by_word` is verse-wide, not line-scoped.

- Each group's `text` keeps internal seps attached (`slice[0..n-2].map(t => t.word + t.sep).join('') + lastWord`); the **trailing sep is split off into `sep`** so the original separator (space / hyphen / comma / multi-space indent) can be rendered verbatim between pairs. `sep` is stored as-is — the renderer converts whitespace runs to NBSPs.
- If dict runs out before text does, remaining tokens get `trans: '-'`.

Mismatches are intentional dead-ends: if `text` and `word_by_word` aren't 1-to-1 token-count-aligned, columns will drift from that point. Fix the source data — do not add lookahead/fuzzy logic here.

## Render Layout (`LearnVerse.tsx` + `.scss`)

```
┌─────────┐ ┌──────────────┐ ┌──────┐
│ word/ph │ │ longer word  │ │ word │   ← .LearnVerse__word  (bold, top)
│ trans   │ │ trans phrase │ │  -   │   ← .LearnVerse__trans (smaller, grey, bottom)
└─────────┘ └──────────────┘ └──────┘
```

- `.LearnVerse__line` is a plain block (not flex) with `padding-left: 1em; text-indent: -1em;`. This is a **hanging indent** — first line flush at the level set by `__indent--N` (`margin-left`), wrapped continuation lines pushed 1em further right. Mirrors the same trick in `VerseText`; do not switch back to a flex line or `text-indent` is ignored.
- `.LearnVerse__pair` is `display: inline-flex; flex-direction: column; vertical-align: top; text-indent: 0` — pairs flow inline so they wrap naturally with the surrounding line, while internally stacking word over translation. `text-indent: 0` prevents the negative indent from re-applying inside each pair.
- Inter-pair spacing on the **word row** comes from the original `sep` rendered after each word (space / `-` / `,` / multi-space indents). Whitespace chars in `sep` must be rendered as **NBSP (`\u00A0`)** — plain spaces inside the word span are trailing whitespace of a flex-item block and get collapsed to zero width. Multi-space runs (the `    ` indents that VerseText renders as `Verse__space`) are preserved by converting each whitespace char individually. Inter-pair spacing on the **translation row** is `margin-right` on `.LearnVerse__trans` (translations would otherwise butt up against the next pair when the separator is a hyphen with no space).
- `.LearnVerse__trans--missing` styles the literal `'-'` for unmatched tokens.

## Light-text rules (parity with `VerseText`)

`LearnVerse` mirrors VerseText's `meta` handling for visual consistency:

- `meta['verse parentheses'] === 'non bold'` → words containing `(` or `)` get `LearnVerse__word--light`.
- `meta['inline verse'] === 'non bold' && !hasNumber` → all words light.
- Empty-line detection delegates to `getLineContent(line, meta, hasNumber)` (same rule as VerseText) so blank lines render `<br/>` identically across modes.

## Adding new behaviour — checklist

1. Need a new separator (e.g. `;`)? Update `SEP_CHARS` only.
2. Need a different word_by_word format? Extend `parseWordByWord`'s regex; do not add a second parser.
3. Need to change column visuals? Edit `.LearnVerse__pair` / `.LearnVerse__line`; do not switch the line back to flex — the hanging-indent for wrapped lines depends on `text-indent` working on a block.
4. Adding props to `LearnVerse` that mirror `VerseText` (e.g. `meta`, `hasNumber`) — keep prop names identical so future shared logic stays trivial.
