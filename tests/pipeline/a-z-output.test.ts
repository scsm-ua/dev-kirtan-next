import { describe, expect, it } from 'vitest';

import { compareFirstLines } from '@/scripts/compareHelpers';
import { getFirstLetter } from '@/scripts/createAZ';
import { getBookIds, getItems, getSongItems, readBookFile } from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';

import type { TContentGroup } from '@/types/common';

/**
 * Rules for `a-z.json` as `scripts/createAZ.js` writes it. In this file an
 * item's `title` is a first line and its `aliasName` is the song title.
 */

const getGroups = (bookId: string) => readBookFile<TContentGroup[]>(bookId, 'a-z.json');

describe.each(getBookIds())('a-z.json of %s', (bookId) => {
  const groups = getGroups(bookId);
  const entries = groups.flatMap((group) => group.items);

  it('names every group with one capital letter, in alphabetical order', () => {
    const names = groups.map((group) => group.name);
    const sorted = [...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    expect(names).toEqual(sorted);
    expect(names.filter((name) => [...name].length !== 1 || name !== name.toUpperCase())).toEqual([]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('puts every first line under its first letter', () => {
    const problems = groups.flatMap((group) =>
      group.items
        .filter((item) => getFirstLetter({ aliasName: item.title }).toUpperCase() !== group.name)
        .map((item) => `${bookId}/${item.id}: "${item.title}" is under ${group.name}`)
    );

    expect(problems).toEqual([]);
  });

  it('sorts the first lines of a group', () => {
    const problems = groups.flatMap((group) =>
      group.items
        .slice(1)
        .filter((item, i) => compareFirstLines(group.items[i].title, item.title) > 0)
        .map((item) => `${bookId}/${item.id}: "${item.title}" is out of order`)
    );

    expect(problems).toEqual([]);
  });

  it('lists every song with a first line, and nothing else', () => {
    const expected = getSongItems(bookId)
      .filter((item) => item.aliasName && item.id !== 'intro')
      .map((item) => item.id);

    expect([...new Set(entries.map((item) => item.id))].sort()).toEqual(expected.sort());
  });

  it('shows the song title next to the first line', () => {
    const titles = new Map(getSongItems(bookId).map((item) => [item.id, item.title]));
    const problems = entries
      .filter((item) => item.aliasName !== titles.get(item.id))
      .map((item) => `${bookId}/${item.id}`);

    expect(problems).toEqual([]);
  });

  it('lists a first line of a song once', () => {
    const keys = entries.map((item) => `${bookId}/${item.id}: ${item.title}`);

    expect(keys.filter((key, i) => keys.indexOf(key) !== i)).toEqual([]);
  });
});

describe('a-z.json cases', () => {
  it('lists a song under each of its alternative first lines', () => {
    const { bookId, slug } = findSong('alt-first-lines');
    const item = getItems(bookId).find((candidate) => candidate.id === slug);
    const lines = getGroups(bookId)
      .flatMap((group) => group.items)
      .filter((entry) => entry.id === slug);

    expect(lines.length).toBeGreaterThanOrEqual(1 + item.altAliasNames.length);
  });
});
