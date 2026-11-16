import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { BOOKS_DIR, getBookIds, getItems, readSong } from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';

import type { TItem, TSongFile } from '@/tests/helpers/books';

/** Rules for `contents.json` as `scripts/transformContents.js` writes it. */

const toArray = <T>(value: T | T[] | undefined): T[] =>
  !value ? [] : Array.isArray(value) ? value : [value];

describe.each(getBookIds())('contents.json of %s', (bookId) => {
  const items = getItems(bookId);
  const songItems = items.filter((item) => item.type === 'song');

  /** Runs `check` for every song item; a returned text is a problem. */
  const checkSongs = (check: (item: TItem, song: TSongFile) => string | false) => {
    const problems = songItems.flatMap((item) => {
      const problem = check(item, readSong(bookId, item.id));
      return problem ? [`${bookId}/${item.id}: ${problem}`] : [];
    });

    expect(problems).toEqual([]);
  };

  it('has songs', () => {
    expect(songItems.length).toBeGreaterThan(0);
  });

  it('has a file for every item, in the folder of its type', () => {
    const missing = items
      .map((item) => path.join(bookId, item.type === 'page' ? 'pages' : 'songs', `${item.id}.json`))
      .filter((file) => !existsSync(path.join(BOOKS_DIR, file)));

    expect(missing).toEqual([]);
  });

  it('gives every item an id, a title and a known type', () => {
    const problems = items
      .filter((item) => !item.id || !item.title || !['song', 'page'].includes(item.type))
      .map((item) => `${bookId}/${item.id}`);

    expect(problems).toEqual([]);
  });

  it('takes the first line of a song from the song file', () => {
    checkSongs((item, song) => item.aliasName !== song.meta.first_line && 'first line differs');
  });

  it('lists the pages of the song, the shown page being one of them', () => {
    checkSongs((item, song) => {
      const pages = toArray(song.meta.page);

      if (JSON.stringify(item.pages) !== JSON.stringify(pages)) return 'pages differ';
      if (pages.length ? !pages.includes(item.page) : item.page != null) return 'page is not one of pages';
      return false;
    });
  });

  it('gives a repeated song with several pages its first page, then its second one', () => {
    const seen = new Set<string>();

    checkSongs((item) => {
      if (item.pages.length < 2) return false;

      const expected = item.pages[seen.has(item.id) ? 1 : 0];
      seen.add(item.id);
      return item.page !== expected && `page ${item.page} instead of ${expected}`;
    });
  });

  it('knows whether a song has audio and a translation', () => {
    checkSongs((item, song) => {
      if (item.has.audio !== !!song.resources?.audio?.length) return 'has.audio is wrong';
      if (item.has.translation !== (song.meta.translation !== 'no')) return 'has.translation is wrong';
      return false;
    });
  });

  it('takes the author from the song, or none for a song marked so', () => {
    checkSongs((item, song) => {
      const expected =
        song.meta['no-author'] === 1 ? null : song.meta.author || song.author?.[0] || null;

      return item.author !== expected && `author "${item.author}" instead of "${expected}"`;
    });
  });
});

describe('cases the rules above rely on', () => {
  it.each([
    'meta-author',
    'author-line-only',
    'no-author',
    'listed-twice-with-several-pages',
    'no-translation',
    'no-audio'
  ] as const)('a real song covers "%s"', (name) => {
    expect(findSong(name)).toBeDefined();
  });
});
