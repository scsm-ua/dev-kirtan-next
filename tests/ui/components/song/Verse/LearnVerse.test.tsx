import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import LearnVerse from '@/components/song/Verse/LearnVerse';
import { getLineContent } from '@/components/song/Verse/helpers';
import { findSongPage } from '@/tests/helpers/pageData';

import type { TInlineWbwEntry, TSong } from '@/types/song';

const NBSP = '\u00A0';
let song: TSong;

beforeAll(async () => {
  song = (await findSongPage('a song with the per-word view', (s) => s.fullInlineWbw)).data.song;
});

function renderLines(lines: TInlineWbwEntry[][], text = lines.map((line) => line.map((e) => e.text + e.sep).join('')), meta: TSong['meta'] = { first_line: '' }, hasNumber = true) {
  return render(<LearnVerse hasNumber={hasNumber} lines={lines} meta={meta} text={text} />);
}

const entry = (text: string, trans: string, extra: Partial<TInlineWbwEntry> = {}): TInlineWbwEntry => ({ text, trans, sep: ' ', ...extra });

/** Text of an element, with each `<br>` read as the space it replaced. */
function textWithBreaks(el: Element): string {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
  return copy.textContent;
}

describe('LearnVerse on real verses', () => {
  it('pairs every word group with its translation, line by line', () => {
    const problems: string[] = [];

    song.verses
      .filter((verse) => verse.inline_word_by_word)
      .forEach((verse, verseIndex) => {
        const { container, unmount } = render(
          <LearnVerse hasNumber={!!verse.number} lines={verse.inline_word_by_word} meta={song.meta} text={verse.text} />
        );
        const lines = [...container.querySelectorAll('.LearnVerse__line')];
        const expected = verse.text
          .map((line, index) => ({ line, entries: verse.inline_word_by_word[index] }))
          .filter(({ line }) => getLineContent(line, song.meta, !!verse.number));

        if (lines.length !== expected.length) problems.push(`verse ${verseIndex}: ${lines.length} lines, expected ${expected.length}`);
        if (container.querySelectorAll('.LearnVerse__empty').length !== verse.text.length - expected.length) {
          problems.push(`verse ${verseIndex}: wrong number of empty lines`);
        }

        lines.forEach((line, index) => {
          const pairs = [...line.querySelectorAll('.LearnVerse__pair')].map((pair) => [
            pair.querySelector('.LearnVerse__word').textContent,
            textWithBreaks(pair.querySelector('.LearnVerse__trans'))
          ]);
          const want = expected[index].entries.map(({ sep, text, trans }) => [text + sep.replace(/\s/g, NBSP), trans]);
          if (JSON.stringify(pairs) !== JSON.stringify(want)) problems.push(`verse ${verseIndex}, line ${index}`);
        });

        unmount();
      });

    expect(problems).toEqual([]);
  });
});

describe('LearnVerse marks', () => {
  it('marks a word without translation and a word that does not match the dictionary', () => {
    const { container } = renderLines([[entry('jaya', '-'), entry('rādhe', 'O Rādhā', { error: 'mismatch' }), entry('śrī', 'beautiful', { error: 'multi' })]]);
    const trans = [...container.querySelectorAll('.LearnVerse__trans')];

    expect(trans[0].classList.contains('LearnVerse__trans--missing')).toBe(true);
    expect(trans[1].classList.contains('LearnVerse__trans--error-mismatch')).toBe(true);
    expect(trans[2].classList.contains('LearnVerse__trans--error-multi')).toBe(true);
    expect(trans[2].classList.contains('LearnVerse__trans--missing')).toBe(false);
  });

  it('shows words in brackets light', () => {
    const { container } = renderLines([[entry('(hari)', 'Lord'), entry('bol', 'say')]]);
    const words = [...container.querySelectorAll('.LearnVerse__word')];

    expect(words.map((word) => word.classList.contains('LearnVerse__word--light'))).toEqual([true, false]);
  });

  it('shows every word light in an unnumbered verse of a book with light inline verses', () => {
    const meta = { first_line: '', styles: { verses: { inline: { bold: false } } } };
    const { container } = renderLines([[entry('hari', 'Lord'), entry('bol', 'say')]], undefined, meta, false);

    expect(container.querySelectorAll('.LearnVerse__word--light')).toHaveLength(2);
  });

  it('keeps multi-space gaps as non-breaking spaces', () => {
    const { container } = renderLines([[entry('hari', 'Lord', { sep: '    ' }), entry('bol', 'say', { sep: '' })]]);

    expect(container.querySelector('.LearnVerse__word').textContent).toBe(`hari${NBSP.repeat(4)}`);
  });

  it.each([
    ['main (a qualifier)', ['main', '(a qualifier)']],
    ['(a qualifier) main', ['(a qualifier)', 'main']],
    ['word (x)', ['word (x)']]
  ])('puts a long bracketed part of "%s" on its own line', (trans, parts) => {
    const { container } = renderLines([[entry('hari', trans)]]);
    const node = container.querySelector('.LearnVerse__trans');

    expect(node.querySelectorAll('br')).toHaveLength(parts.length - 1);
    expect(node.textContent).toBe(parts.join(''));
  });
});
