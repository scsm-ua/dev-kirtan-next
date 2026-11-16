import { describe, expect, it } from 'vitest';

import { compareFirstLines } from '@/scripts/compareHelpers';
import { getBookIds, getSongItems, readBookFile } from '@/tests/helpers/books';

import type { TItem } from '@/tests/helpers/books';

/** Rules for `authors.json` as `scripts/createAuthors.js` writes it. */

type TAuthorGroup = { name: string | null; items: TItem[] };

describe.each(getBookIds())('authors.json of %s', (bookId) => {
  const groups = readBookFile<TAuthorGroup[]>(bookId, 'authors.json');

  it('lists every song once, and nothing else', () => {
    const expected = getSongItems(bookId)
      .filter((item) => item.id !== 'intro')
      .map((item) => item.id);
    const listed = groups.flatMap((group) => group.items.map((item) => item.id));

    expect(listed.sort()).toEqual(expected.sort());
  });

  it('puts every song under its own author', () => {
    const problems = groups.flatMap((group) =>
      group.items
        .filter((item) => item.author !== group.name)
        .map((item) => `${bookId}/${item.id}: "${item.author}" is under "${group.name}"`)
    );

    expect(problems).toEqual([]);
    expect(new Set(groups.map((group) => group.name)).size).toBe(groups.length);
  });

  it('puts the authors with more songs first, equal ones by name', () => {
    const problems = groups.slice(1).filter((group, i) => {
      const previous = groups[i];

      return previous.items.length === group.items.length
        ? (previous.name || '').localeCompare(group.name || '') > 0
        : previous.items.length < group.items.length;
    });

    expect(problems.map((group) => `${bookId}: "${group.name}" is out of order`)).toEqual([]);
  });

  it('sorts the songs of an author by the first line', () => {
    const line = (item: TItem) => item.aliasName || item.title;
    const problems = groups.flatMap((group) =>
      group.items
        .slice(1)
        .filter((item, i) => compareFirstLines(line(group.items[i]), line(item)) > 0)
        .map((item) => `${bookId}/${item.id}: "${line(item)}" is out of order`)
    );

    expect(problems).toEqual([]);
  });
});
