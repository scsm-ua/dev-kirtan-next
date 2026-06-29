import type { TSong } from '@/types/song';

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
export type TWbwEntry = { key: string[]; trans: string };

/**/
export type TLearnGroup = { text: string; trans: string; sep: string };

// Separators between words: whitespace, comma, dot, hyphen. Kept in output.
const SEP_CHARS = '\\s,.\\-';
const WORD_RE = new RegExp(`([^${SEP_CHARS}]+)([${SEP_CHARS}]*)`, 'g');

/**
 * Tokenize a verse line into `{ word, sep }` pairs where `sep` is the
 * original trailing separator (spaces/commas/dots/hyphens). Tokens
 * recombined with their seps reproduce the source text exactly.
 */
export function tokenizeLine(aLine: string): { word: string; sep: string }[] {
  const line = aLine.replace(TAG_RE, '').trim();
  if (!line) return [];
  const tokens: { word: string; sep: string }[] = [];
  const re = new RegExp(WORD_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    tokens.push({ word: m[1], sep: m[2] });
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
export function buildLearnLines(
  text: string[],
  wordByWord: string[]
): TLearnGroup[][] {
  const dict = parseWordByWord(wordByWord);
  let cursor = 0;

  return text.map((line) => {
    const tokens = tokenizeLine(line);
    const groups: TLearnGroup[] = [];
    let i = 0;

    while (i < tokens.length) {
      const entry: TWbwEntry | undefined = dict[cursor];
      const wanted = entry ? entry.key.length : 1;
      const len = Math.min(wanted, tokens.length - i);
      const slice = tokens.slice(i, i + len);
      // Keep internal seps attached; the trailing sep is emitted between pairs
      // so the original separator (space / hyphen / comma) renders verbatim.
      const last = slice[slice.length - 1];
      const textOut =
        slice.slice(0, -1).map((t) => t.word + t.sep).join('') + last.word;
      // Keep the original sep verbatim (including multi-space indents);
      // the renderer converts whitespace to NBSPs so widths survive.
      groups.push({ text: textOut, trans: entry ? entry.trans : '-', sep: last.sep });
      i += len;
      if (entry) cursor++;
    }

    return groups;
  });
}
