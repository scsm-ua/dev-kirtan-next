import { describe, expect, it } from 'vitest';

import { compareBooks, compareFirstLines, stripMarks } from '@/scripts/compareHelpers';

describe('stripMarks', () => {
  it('removes diacritics, including dots below', () => {
    expect(stripMarks('Śrī Kṛṣṇa')).toBe('Sri Krsna');
  });

  it('leaves plain text as it is', () => {
    expect(stripMarks('plain text')).toBe('plain text');
  });
});

describe('compareFirstLines', () => {
  it.each([
    ['diacritics', 'āmāra jīvana', 'amara jivana'],
    ['brackets', '(kiba) jaya', 'kiba jaya'],
    ['quotes and commas', '‘hari’, hari', 'hari hari'],
    ['hyphens', 'gaura-hari', 'gaurahari'],
    ['repeated spaces', 'a   b', 'a b']
  ])('ignores %s', (_name, a, b) => {
    expect(compareFirstLines(a, b)).toBe(0);
  });

  it('sorts lines as a reader expects', () => {
    const lines = ['(kiba) jaya', 'Emona', 'bhaja', 'āmāra', 'amara dui'];

    expect(lines.sort(compareFirstLines)).toEqual([
      'āmāra',
      'amara dui',
      'bhaja',
      'Emona',
      '(kiba) jaya'
    ]);
  });

  it('compares numbers by value', () => {
    expect(compareFirstLines('verse 2', 'verse 10')).toBeLessThan(0);
  });
});

describe('compareBooks', () => {
  it('sorts by sort_order and puts books without it last', () => {
    const books = [{ id: 'none' }, { id: 'second', sort_order: 2 }, { id: 'first', sort_order: 1 }];

    expect(books.sort(compareBooks).map((book) => book.id)).toEqual(['first', 'second', 'none']);
  });

  it('treats two books without sort_order as equal', () => {
    expect(compareBooks({}, {})).toBe(0);
  });
});
