import { describe, expect, it } from 'vitest';

import { getDescription, getSongMeta } from '@/lib/content/song/meta';
import { songHandler } from '@/lib/content/song';
import { SITE } from '@/other/constants';
import { getBookLocale } from '@/other/helpers';
import { getAbsoluteUrl, getSongPath } from '@/other/paths';
import { getBookIds, getItems } from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';

import type { TSong } from '@/types/song';

const LANGUAGES = [...new Set(getBookIds().map((bookId) => bookId.slice(0, 2)))];

/**/
function makeSong(changes: object = {}): TSong {
  return {
    author: ['Author Line'],
    meta: { author: 'Meta Author', first_line: 'first line' },
    title: ['Song', 'Title'],
    ...changes
  } as unknown as TSong;
}

describe.each(LANGUAGES)('getDescription in "%s"', (language) => {
  it('names the song, its author and the book', () => {
    const description = getDescription(makeSong(), language, 'Book Title');

    expect(description).toContain('Song Title');
    expect(description).toContain('Meta Author');
    expect(description).toContain('Book Title');
    expect(description).not.toMatch(/[{}]/);
  });

  it('uses the author line of a song without meta.author', () => {
    const description = getDescription(makeSong({ meta: { first_line: 'first line' } }), language, 'Book Title');

    expect(description).toContain('Author Line');
  });

  it('uses another sentence for a song without an author', () => {
    const song = makeSong({ author: [], meta: { first_line: 'first line' } });
    const description = getDescription(song, language, 'Book Title');

    expect(description).toContain('Song Title');
    expect(description).toContain('Book Title');
    expect(description).not.toMatch(/[{}]/);
  });

  it('starts with the first line only when the sentence is short', () => {
    const short = getDescription(makeSong(), language, 'Book Title');
    const long = getDescription(makeSong({ title: ['Long title '.repeat(12)] }), language, 'Book Title');
    const prefix = 'first line. ';

    expect(short.startsWith(prefix)).toBe(short.replace(prefix, '').length <= 120);
    expect(long.startsWith(prefix)).toBe(false);
  });
});

describe('getSongMeta', () => {
  it.each(['in-several-books', 'in-one-book', 'no-author'] as const)(
    'describes a real song: %s',
    async (name) => {
      const { bookId, slug } = findSong(name);
      const song = await songHandler.load(slug, bookId);
      const meta = await getSongMeta(song, { bookId, slug });
      const path = getSongPath(bookId, slug);

      expect(meta.alternates.canonical).toBe(path);
      expect(meta.title).toMatch(new RegExp(` \\| ${SITE.NAME}$`));
      expect(meta.title as string).toContain(song.title.join(' '));
      expect(meta.description).toBeTruthy();
      expect(meta.openGraph).toMatchObject({ type: 'music.song', url: getAbsoluteUrl(path) });
      expect(meta.keywords).toContain(song.title[0]);
    }
  );

  it('lists the song in the other books as language alternates', async () => {
    const { bookId, slug } = findSong('in-several-books');
    const song = await songHandler.load(slug, bookId);
    const { languages } = (await getSongMeta(song, { bookId, slug })).alternates;

    const booksWithSong = getBookIds().filter((id) => getItems(id).some((item) => item.id === slug));
    const { 'x-default': fallback, ...byLocale } = languages as Record<string, string>;

    expect(fallback).toBe(getSongPath(bookId, slug));
    expect(Object.keys(byLocale).sort()).toEqual([...new Set(booksWithSong.map(getBookLocale))].sort());

    for (const [locale, path] of Object.entries(byLocale)) {
      const candidates = booksWithSong.filter((id) => getBookLocale(id) === locale);
      expect(candidates.map((id) => getSongPath(id, slug)), locale).toContain(path);
    }
  });
});
