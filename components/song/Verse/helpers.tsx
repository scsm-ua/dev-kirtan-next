import type { TInlineWbwEntry, TSong, TWbwEntry } from '@/types/song';

/**
 *
 */
export function getLineIndent(line: string) {
  const res = line.match(/^\s+/);

  if (res) {
    const count = Math.floor(res[0].length / 4);
    return count > 4 ? 4 : count;
  }

  return 0;
}

const TAG_RE = /<[^>]+>/gi;
const PARANTHESES_RE = /(\([^\)]+\))/gi;
const PARANTHESES_START_RE = /(\([^\)]+)\s*$/gi; // ) End in next line.
const PARANTHESES_END_RE = /^(\s*)([^\)]+\))/gi; // ( Start in prev line.

/**
 * EJS trims lines even despite 'rmWhitespace: false'.
 * But we want some verse lines have extra space in the beginning.
 */
export function getLineContent(
  aLine: string,
  meta: TSong['meta'],
  hasNumber: boolean
): string {
  // Cleanup tags for safety.
  let line = aLine.replace(TAG_RE, '');

  if (meta && meta['verse parentheses'] === 'non bold') {
    line = line.replace(
      PARANTHESES_RE,
      '<span class="Verse__light">$1</span>'
    );
    line = line.replace(
      PARANTHESES_START_RE,
      '<span class="Verse__light">$1</span>'
    );
    line = line.replace(
      PARANTHESES_END_RE,
      '$1<span class="Verse__light">$2</span>'
    );
  } else if (
    meta &&
    meta['inline verse'] === 'non bold' &&
    !hasNumber
  ) {
    line = `<span class="Verse__light">${line}</span>`;
  }

  // Try fix with indents.
  // Remove starting indent (as its fixed by `getLineIndentClass`).
  line = line.replace(/^\s+/, '');
  // Replace inner tabs.
  line = line.replace(
    /\s{4}/gi,
    '<span class="Verse__space">&nbsp;&nbsp;&nbsp;&nbsp;</span>'
  );

  return line;
}

/**/
// Separators between words: whitespace, comma, dot, hyphen, sentence
// punctuation (`! ? : ;`), brackets (`( ) [ ]`), apostrophe (`'`). Kept in output verbatim
// as each token's trailing `sep`. Used by both `tokenizeLine` (text side) and
// `parseWordByWord` (key side) — keep in lockstep or alignment breaks.
const SEP_CHARS = "\\s,.\\-!?:;()\\[\\]'";
// Capture leading seps + word + trailing seps. `pre` is non-empty only on the
// first token (subsequent tokens' leading seps are consumed by the previous
// token's trailing `sep`) — but we keep it on every token for shape symmetry.
const WORD_RE = new RegExp(
  `([${SEP_CHARS}]*)([^${SEP_CHARS}]+)([${SEP_CHARS}]*)`,
  'g'
);

/**
 * Tokenize a verse line into `{ pre, word, sep }` triples where `pre` is any
 * leading separator (parens/brackets) and `sep` is the trailing separator
 * (spaces/commas/dots/hyphens/brackets). Recombining `pre + word + sep`
 * across tokens reproduces the source text verbatim.
 */
export function tokenizeLine(
  aLine: string
): { pre: string; word: string; sep: string }[] {
  const line = aLine.replace(TAG_RE, '').trim();
  if (!line) return [];
  const tokens: { pre: string; word: string; sep: string }[] = [];
  const re = new RegExp(WORD_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    tokens.push({ pre: m[1], word: m[2], sep: m[3] });
  }
  return tokens;
}

/**
 * Parse word-by-word lines into an ordered list of `{ key, trans }` entries.
 * Supports both formats:
 *   "**key one** — trans one; **key2** — trans2."   (semicolon separated)
 *   "**key**–trans **key2**–trans2"                  (only **...** delimits entries)
 * Each entry starts at `**`, key runs to the next `**`, then a dash
 * (`-`, `–`, `—`) and the translation up to the next `**` or end of string.
 */
export function parseWordByWord(lines: string[]): TWbwEntry[] {
  if (!lines?.length) return [];
  const joined = lines.join(' ');
  const out: TWbwEntry[] = [];
  const re = /\*\*([^*]+?)\*\*\s*[\u2014\u2013-]\s*([\s\S]+?)(?=\s*\*\*|\s*$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(joined)) !== null) {
    const key = m[1].split(new RegExp(`[${SEP_CHARS}]+`)).filter(Boolean);
    // Strip only outer whitespace and the entry-separator punctuation `,;.`;
    // do NOT strip `)` / `]` — they may be balanced content (e.g. "(of Orissa)").
    const trans = m[2].replace(/^\s+/, '').replace(/[\s.,;]+$/, '').trim();
    if (key.length && trans) out.push({ key, trans });
  }
  return out;
}

/**
 * Walk verse text in order, consuming `key.length` text tokens per dict entry.
 * No fuzzy matching: data is expected to be 1-to-1. Original separators
 * (spaces/commas/dots/hyphens) are preserved in each group's text.
 * If dict runs out before text does, remaining tokens get translation '-'.
 */
export function buildInlineWordByWord(
  text: string[],
  wordByWord: string[]
): TInlineWbwEntry[][] {
  const dict = parseWordByWord(wordByWord);
  let cursor = 0;

  return text.map((line) => {
    const tokens = tokenizeLine(line);
    const groups: TInlineWbwEntry[] = [];
    let i = 0;

    while (i < tokens.length) {
      const entry: TWbwEntry | undefined = dict[cursor];
      const wanted = entry ? entry.key.length : 1;
      const len = Math.min(wanted, tokens.length - i);
      const slice = tokens.slice(i, i + len);
      // Keep internal seps attached; the trailing sep is emitted between pairs
      // so the original separator (space / hyphen / comma) renders verbatim.
      // The leading `pre` of the first token preserves any opening bracket
      // that would otherwise be dropped at the start of a line.
      const first = slice[0];
      const last = slice[slice.length - 1];
      const textOut =
        first.pre +
        slice.slice(0, -1).map((t) => t.word + t.sep).join('') + last.word;
      // Mirror `wbwInlineModeAvailable`'s per-entry checks, but classify:
      // - 'multi'    — dict entry has a multi-word key (rare, ambiguous slice)
      // - 'mismatch' — dict ran out, or key[0] doesn't match the text token
      let error: 'multi' | 'mismatch' | undefined;
      if (!entry || entry.key[0] !== first.word) error = 'mismatch';
      else if (entry.key.length !== 1) error = 'multi';
      // Keep the original sep verbatim (including multi-space indents);
      // the renderer converts whitespace to NBSPs so widths survive.
      groups.push({
        text: textOut,
        trans: entry ? entry.trans : '-',
        sep: last.sep,
        ...(error ? { error } : {})
      });
      i += len;
      if (entry) cursor++;
    }

    return groups;
  });
}

/**
 * Detect whether the per-word inline Learn mode is meaningful for a verse:
 * every parsed `word_by_word` entry maps a single source word to a translation,
 * and that source word appears in the verse text. When false, the verse only
 * supports the classical (block) wbw layout.
 */
export function wbwInlineModeAvailable(
  text: string[],
  wordByWord: string[]
): boolean {
  if (!text?.length || !wordByWord?.length) return false;
  const dict = parseWordByWord(wordByWord);
  if (!dict.length) return false;
  const multi = dict.find((e) => e.key.length !== 1);
  if (multi) {
    // console.warn(
    //   `[wbwInlineModeAvailable] multi-word key:`, JSON.stringify(multi)
    // );
    return false;
  }
  const textTokens = new Set<string>();
  for (const line of text) {
    for (const tok of tokenizeLine(line)) textTokens.add(tok.word);
  }
  const missing = dict.find((e) => !textTokens.has(e.key[0]));
  if (missing) {
    // console.warn(
    //   `[wbwInlineModeAvailable] key not found in text: "${missing.key[0]}"`
    // );
    return false;
  }
  return true;
}
