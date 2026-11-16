import { afterEach, describe, expect, it, vi } from 'vitest';

import { songHandler } from '@/lib/content/song';
import { getBookIds, getSongItems, readSong } from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';

describe('songHandler.load', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads a song with its derived fields', async () => {
    const { bookId, slug } = findSong('word-by-word');
    const song = await songHandler.load(slug, bookId);

    expect(song.hasWbw).toBe(true);
    expect(song.title.length).toBeGreaterThan(0);
  });

  it('points the images inside translations to their local copies', async () => {
    const hasImage = (line: string) => line.includes('![');
    const songs = getBookIds().flatMap((bookId) =>
      getSongItems(bookId)
        .filter(({ id }) => readSong(bookId, id).verses.some((verse) => verse.translation?.some(hasImage)))
        .map(({ id }) => ({ bookId, slug: id }))
    );
    const problems: string[] = [];

    for (const { bookId, slug } of songs) {
      const song = await songHandler.load(slug, bookId);
      const lines = song.verses.flatMap((verse) => verse.translation?.filter(hasImage) ?? []);

      if (!lines.every((line) => /!\[[^\]]*\]\(\/images\/resources\/[^)]+\)/.test(line))) {
        problems.push(`${bookId}/${slug}`);
      }
    }

    expect(songs.length).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });

  it('reports a missing song and returns null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await songHandler.load('no-such-song', getBookIds()[0])).toBeNull();
  });
});
