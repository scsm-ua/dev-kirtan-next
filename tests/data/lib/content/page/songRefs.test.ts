import { describe, expect, it } from 'vitest';

import { linkifySongRefs } from '@/lib/content/page/songRefs';

import type { TContentGroup } from '@/types/common';

/** A–Z groups: `title` is a first line. */
const GROUPS = [
  {
    name: 'J',
    items: [
      { id: 'jaya-radhe', title: 'jaya rādhe jaya kṛṣṇa', page: 49, pages: [49] },
      { id: 'jaya-gaura-hari', title: 'jaya gaura hari', page: 50, pages: [50] },
      { id: 'jaya-gaura-nitai', title: 'jaya gaura nitāi', page: 51, pages: [51] },
      { id: 'shared-a', title: 'eka line', page: 60, pages: [60] },
      { id: 'shared-b', title: 'dui line', page: 60, pages: [60] },
      { id: 'same-a', title: 'Hari Hari', page: 70, pages: [70] },
      { id: 'same-b', title: 'hari hari', page: 71, pages: [71] }
    ]
  }
] as unknown as TContentGroup[];

const linkify = (line: string) => linkifySongRefs(line, GROUPS, 'en');
const link = (slug: string, text: string, page: string) =>
  `<p class="SongRef"><a class="song-ref" href="/en/${slug}/">${text}</a> <span class="page-num">${page}</span></p>`;

describe('linkifySongRefs', () => {
  it('links a first line, ignoring case and diacritics', () => {
    expect(linkify('    Jaya Radhe jaya Krsna 49')).toBe(
      link('jaya-radhe', '<em>Jaya Radhe jaya Krsna</em>', '49')
    );
  });

  it('links a first line that is cut short', () => {
    expect(linkify('    jaya rādhe 49')).toBe(link('jaya-radhe', '<em>jaya rādhe</em>', '49'));
  });

  it('keeps a page range as the page text', () => {
    expect(linkify('    jaya rādhe pages 49 - 50')).toBe(
      link('jaya-radhe', '<em>jaya rādhe</em>', 'pages 49 - 50')
    );
  });

  it.each([
    ['a text that is not a first line', '    Some heading 51', link('jaya-gaura-nitai', 'Some heading', '51')],
    ['a first line that fits two songs', '    jaya gaura 50', link('jaya-gaura-hari', 'jaya gaura', '50')],
    ['a first line that two songs share', '    hari hari 71', link('same-b', 'hari hari', '71')]
  ])('falls back to the page number for %s', (_name, line, expected) => {
    expect(linkify(line)).toBe(expected);
  });

  it('escapes the text', () => {
    expect(linkify('    a < b 51')).toBe(link('jaya-gaura-nitai', 'a &lt; b', '51'));
  });

  it.each([
    ['a page that several songs share', '    Some heading 60'],
    ['an unknown page', '    Some heading 99'],
    ['an ambiguous first line with a page range', '    jaya gaura pages 50 - 51'],
    ['a line without a page number', '    jaya rādhe jaya kṛṣṇa'],
    ['a line that is not indented', 'jaya rādhe 49'],
    ['a line with a smaller indent', '   jaya rādhe 49']
  ])('leaves %s alone', (_name, line) => {
    expect(linkify(line)).toBe(line);
  });

  it('changes only the reference lines of a body', () => {
    const body = ['# Heading', '', '    jaya rādhe 49', 'Text.'].join('\n');

    expect(linkify(body).split('\n')).toEqual([
      '# Heading',
      '',
      link('jaya-radhe', '<em>jaya rādhe</em>', '49'),
      'Text.'
    ]);
  });
});
