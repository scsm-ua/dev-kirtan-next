import { describe, expect, it } from 'vitest';

import { NAV_SPAN } from '@/lib/content/exportHtml';
import { renderSong } from '@/lib/content/song/export';

import type { TSong } from '@/types/song';

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN;

/** A song with two verses; `changes` replace top-level fields. */
function makeSong(changes: object = {}): TSong {
  return {
    author: ['by Author'],
    meta: { first_line: 'first line' },
    subtitle: ['Subtitle'],
    title: ['Title', '& more'],
    verses: [
      {
        number: '1',
        text: ['line (aside) end', '    indented  line'],
        translation: ['Translation **bold**'],
        word_by_word: ['**line** — word']
      },
      { number: '2', text: ['second'] }
    ],
    ...changes
  } as unknown as TSong;
}

const render = (changes?: object) => renderSong(makeSong(changes), 'some-song');
const SPACE = '&nbsp;';

describe('renderSong', () => {
  it('wraps the song into a section with its slug', () => {
    const html = render();

    expect(html.startsWith('<section class="song" id="song-some-song" data-translated="1">\n')).toBe(true);
    expect(html.endsWith('</section>\n')).toBe(true);
  });

  it('marks a song that has no translation', () => {
    expect(render({ meta: { first_line: 'first line', translation: 'no' } })).toContain('data-translated="0"');
  });

  it('puts the title, subtitle and author inside the first verse block', () => {
    const header =
      `<h2>Title &amp; more${NAV_SPAN}</h2>\n` + '<h3>Subtitle</h3>\n' + '<h4>by Author</h4>\n';

    expect(render()).toContain(`<div class="verse-block" data-number="1">\n${header}<h5>1</h5>\n`);
  });

  it('makes verse lines bold except text in parentheses, and keeps the spacing', () => {
    expect(render()).toContain(
      '<p class="verse"><strong>line </strong>(aside)<strong> end</strong><br>\n' +
        `<strong>${SPACE.repeat(4)}indented${SPACE.repeat(2)}line</strong></p>\n`
    );
  });

  it('leaves lines plain when the song turns bold verses off, except numbered verses', () => {
    const meta = { first_line: 'first line', styles: { verses: { inline: { bold: false } } } };
    const verses = [{ text: ['plain line'] }, { number: '2', text: ['numbered line'] }];
    const html = render({ meta, verses });

    expect(html).toContain('<p class="verse">plain line</p>');
    expect(html).toContain('<p class="verse"><strong>numbered line</strong></p>');
  });

  it('renders the word-by-word and the translation with their markdown', () => {
    const html = render();

    expect(html).toContain('<p class="wbw"><i class="wbw__bold">line</i> — word</p>\n');
    expect(html).toContain('<p class="translation">Translation <i class="translation__bold">bold</i></p>\n');
  });

  it('renders no paragraph for a part the verse does not have', () => {
    const secondVerse = render().split('<div class="verse-block" data-number="2">')[1];

    expect(secondVerse).toContain('<p class="verse">');
    expect(secondVerse).not.toContain('<p class="wbw">');
    expect(secondVerse).not.toContain('<p class="translation">');
  });

  it('shows no verse number in a song with one verse', () => {
    const html = render({ verses: [{ number: '1', text: ['only'] }] });

    expect(html).toContain('<div class="verse-block" data-number="">');
    expect(html).not.toContain('<h5>');
  });

  it('shows the song image with an absolute address', () => {
    const image = { src: '/images/resources/en/1.png', type: 'image/png', width: 10, height: 20, length: 1 };
    const html = render({ resources: { image } });

    expect(html).toContain(
      `<p class="song-image"><img src="${ORIGIN}images/resources/en/1.png" alt="Title &amp; more" width="10" height="20"`
    );
  });

  it('makes site images inside a translation absolute', () => {
    const verses = [{ text: ['line'], translation: ['![Alt](/images/resources/en/1.png =10x20)'] }];

    expect(render({ verses })).toContain(`src="${ORIGIN}images/resources/en/1.png"`);
  });
});
