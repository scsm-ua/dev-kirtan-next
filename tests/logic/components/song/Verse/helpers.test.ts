import { describe, expect, it } from 'vitest';

import {
  buildInlineWordByWord,
  getLineContent,
  getLineIndent,
  parseWordByWord,
  tokenizeLine,
  wbwInlineModeAvailable
} from '@/components/song/Verse/helpers';

const light = (text: string) => `<span class="Verse__light">${text}</span>`;

describe('getLineIndent', () => {
  it.each([
    ['', 0],
    ['abc', 0],
    ['   abc', 0],
    ['    abc', 1],
    ['        abc', 2],
    [' '.repeat(16) + 'abc', 4],
    [' '.repeat(20) + 'abc', 4]
  ])('"%s" → %i', (line, expected) => {
    expect(getLineIndent(line)).toBe(expected);
  });
});

describe('getLineContent', () => {
  const content = (line: string) => getLineContent(line, undefined, false);

  it('removes HTML tags', () => {
    expect(content('a <b>b</b> c')).toBe('a b c');
  });

  it('removes the leading indent', () => {
    expect(content('    abc')).toBe('abc');
  });

  it('keeps inner four-space gaps as non-breaking spaces', () => {
    expect(content('a    b')).toBe(
      'a<span class="Verse__space">&nbsp;&nbsp;&nbsp;&nbsp;</span>b'
    );
  });

  it.each([
    ['closed on the same line', 'a (b) c', `a ${light('(b)')} c`],
    ['opened here, closed on the next line', 'a (b c', `a ${light('(b c')}`],
    ['opened on the previous line', 'b c) d', `${light('b c)')} d`]
  ])('makes text in parentheses light: %s', (_name, line, expected) => {
    expect(content(line)).toBe(expected);
  });

  it('makes the whole line light when the book turns bold verses off', () => {
    const meta = { styles: { verses: { inline: { bold: false } } } };

    expect(getLineContent('a (b)', meta as never, false)).toBe(light('a (b)'));
    expect(getLineContent('a (b)', meta as never, true)).toBe(`a ${light('(b)')}`);
  });
});

describe('tokenizeLine', () => {
  it('returns no tokens for an empty line', () => {
    expect(tokenizeLine('')).toEqual([]);
    expect(tokenizeLine('   ')).toEqual([]);
  });

  it.each([
    ['a b', [['', 'a', ' '], ['', 'b', '']]],
    ['gaura-hari', [['', 'gaura', '-'], ['', 'hari', '']]],
    ['(kiba) jaya', [['(', 'kiba', ') '], ['', 'jaya', '']]],
    // The apostrophe belongs to the word it touches.
    ['vande ’ham', [['', 'vande', ' '], ['’', 'ham', '']]],
    ['<i>a</i> b', [['', 'a', ' '], ['', 'b', '']]]
  ])('%s', (line, expected) => {
    const tokens = tokenizeLine(line).map((t) => [t.pre, t.word, t.sep]);

    expect(tokens).toEqual(expected);
  });

  it.each([
    'jaya jaya, gaura-hari!',
    '(kiba) jaya jaya',
    'vande ’ham, vande ‘ham',
    'a  b   c',
    'one [two] three: four; five?'
  ])('loses no character: %s', (line) => {
    const rebuilt = tokenizeLine(line).map((t) => t.pre + t.word + t.sep).join('');

    expect(rebuilt).toBe(line);
  });
});

describe('parseWordByWord', () => {
  it('returns no entries for empty input', () => {
    expect(parseWordByWord([])).toEqual([]);
    expect(parseWordByWord(undefined)).toEqual([]);
    expect(parseWordByWord(['no entries here'])).toEqual([]);
  });

  it('parses semicolon-separated entries', () => {
    expect(parseWordByWord(['**jaya** — glory; **gaura** — to Gaura.'])).toEqual([
      { key: ['jaya'], trans: 'glory' },
      { key: ['gaura'], trans: 'to Gaura' }
    ]);
  });

  it('parses entries separated only by the bold markers', () => {
    expect(parseWordByWord(['**a**–one **b**–two'])).toEqual([
      { key: ['a'], trans: 'one' },
      { key: ['b'], trans: 'two' }
    ]);
  });

  it('continues over line breaks', () => {
    expect(parseWordByWord(['**a** — one;', '**b** - two'])).toEqual([
      { key: ['a'], trans: 'one' },
      { key: ['b'], trans: 'two' }
    ]);
  });

  it('splits a key into words', () => {
    expect(parseWordByWord(['**jaya jaya** — all glory; **gaura-hari** — Gaura'])).toEqual([
      { key: ['jaya', 'jaya'], trans: 'all glory' },
      { key: ['gaura', 'hari'], trans: 'Gaura' }
    ]);
  });

  it('keeps hyphens and brackets inside the translation', () => {
    expect(parseWordByWord(['**a** - well-known king (of Orissa).'])).toEqual([
      { key: ['a'], trans: 'well-known king (of Orissa)' }
    ]);
  });
});

describe('buildInlineWordByWord', () => {
  it('pairs each word with its translation and keeps the separators', () => {
    const result = buildInlineWordByWord(
      ['jaya, gaura'],
      ['**jaya** — glory; **gaura** — Gaura']
    );

    expect(result).toEqual([
      [
        { text: 'jaya', trans: 'glory', sep: ', ' },
        { text: 'gaura', trans: 'Gaura', sep: '' }
      ]
    ]);
  });

  it('continues through the dictionary across lines', () => {
    const result = buildInlineWordByWord(['a', '', 'b'], ['**a** — one; **b** — two']);

    expect(result).toEqual([
      [{ text: 'a', trans: 'one', sep: '' }],
      [],
      [{ text: 'b', trans: 'two', sep: '' }]
    ]);
  });

  it('marks words left without a translation', () => {
    const [line] = buildInlineWordByWord(['a b'], ['**a** — one']);

    expect(line).toEqual([
      { text: 'a', trans: 'one', sep: ' ' },
      { text: 'b', trans: '-', sep: '', error: 'mismatch' }
    ]);
  });

  it('marks a word that differs from its dictionary key', () => {
    const [line] = buildInlineWordByWord(['a b'], ['**x** — one; **b** — two']);

    expect(line).toEqual([
      { text: 'a', trans: 'one', sep: ' ', error: 'mismatch' },
      { text: 'b', trans: 'two', sep: '' }
    ]);
  });

  it('groups the words of a multi-word key and marks the group', () => {
    const [line] = buildInlineWordByWord(['a b c'], ['**a b** — one; **c** — two']);

    expect(line).toEqual([
      { text: 'a b', trans: 'one', sep: ' ', error: 'multi' },
      { text: 'c', trans: 'two', sep: '' }
    ]);
  });
});

describe('wbwInlineModeAvailable', () => {
  it('is true when every key is one word of the text', () => {
    expect(wbwInlineModeAvailable(['jaya gaura'], ['**jaya** — glory; **gaura** — Gaura'])).toBe(true);
  });

  it.each([
    ['no text', [], ['**a** — one']],
    ['no word-by-word', ['a'], []],
    ['word-by-word without entries', ['a'], ['plain text']],
    ['a multi-word key', ['a b'], ['**a b** — one']],
    ['a key that is not in the text', ['a'], ['**x** — one']]
  ])('is false for %s', (_name, text, wordByWord) => {
    expect(wbwInlineModeAvailable(text, wordByWord)).toBe(false);
  });
});
