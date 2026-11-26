import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  getSingers,
  getSingerTracks,
  hasBookAudio,
  hasSinger
} from '@/lib/audio';
import { sortSingers } from '@/other/sortSingers';
import { compareFirstLines } from '@/scripts/compareHelpers';
import { getBookIds, getItems, readSong } from '@/tests/helpers/books';

// As in `next build`: lib/ caches the audio of a book instead of re-reading every song.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

/** Recordings the audio pages must show: songs with audio that are not hidden, each song once. */
function getRecordings(bookId: string) {
  const slugs = new Set(
    getItems(bookId)
      .filter((item) => item.type === 'song' && item.has.audio && !item.title.includes('(hidden)'))
      .map((item) => item.id)
  );

  return [...slugs].flatMap((slug) => readSong(bookId, slug).resources?.audio ?? []);
}

describe.each(getBookIds())('audio of %s', (bookId) => {
  const recordings = getRecordings(bookId);
  const singers = getSingers(bookId);
  const tracks = getSingerTracks(bookId);

  it('knows whether the book has audio', () => {
    expect(hasBookAudio(bookId)).toBe(recordings.length > 0);
  });

  it('lists every singer once, with the number of recordings, in the site order', () => {
    const ids = singers.map((singer) => singer.id);

    expect([...ids].sort()).toEqual([...new Set(recordings.map((audio) => audio.personSlug))].sort());
    expect(singers.reduce((sum, singer) => sum + singer.count, 0)).toBe(recordings.length);
    expect(singers).toEqual(sortSingers(singers));
    expect(singers.every((singer) => singer.name)).toBe(true);
  });

  it('has a track for every recording', () => {
    expect(tracks.map((track) => track.url).sort()).toEqual(recordings.map((audio) => audio.embed_url).sort());
  });

  it('sorts the tracks by the first line and keeps the contents position', () => {
    const outOfOrder = tracks.slice(1).filter((track, i) => compareFirstLines(tracks[i].label, track.label) > 0);
    const orders = tracks.map((track) => track.order).sort((a, b) => a - b);

    expect(outOfOrder.map((track) => track.label)).toEqual([]);
    expect(orders).toEqual(tracks.map((_track, i) => i));
  });

  it('labels a track with the first line of its song', () => {
    const wrong = tracks.filter((track) => track.label !== (track.item.aliasName || track.item.title));

    expect(wrong.map((track) => track.item.id)).toEqual([]);
  });

  it('gives every singer a playlist of its own recordings', () => {
    for (const singer of singers) {
      const own = getSingerTracks(bookId, singer.id);

      expect(own, singer.id).toHaveLength(singer.count);
      expect(own.every((track) => track.singerName === singer.name), singer.id).toBe(true);
      expect(hasSinger(bookId, singer.id), singer.id).toBe(true);
    }

    expect(hasSinger(bookId, 'no-such-singer')).toBe(false);
    expect(getSingerTracks(bookId, 'no-such-singer')).toEqual([]);
  });
});
