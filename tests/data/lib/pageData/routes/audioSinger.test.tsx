import { afterAll, describe, expect, it, vi } from 'vitest';

import { getSingers } from '@/lib/audio';
import { audioRoute } from '@/lib/pageData/routes/audio';
import { audioSingerRoute } from '@/lib/pageData/routes/audioSinger';
import LdJsonAudio from '@/other/metadata/LdJsonAudio';
import { getBookIds, getBooksMap } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

import type { ReactElement } from 'react';
import type { TSinger } from '@/types/audio';

// As in `next build`: lib/ caches the audio of a book instead of re-reading every song.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const AUDIO_BOOK = getBookIds().find((bookId) => getSingers(bookId).length > 0);

describe.each(getBookIds())('audio routes of %s', (bookId) => {
  const singers = getSingers(bookId);

  it('has the audio page only when the book has recordings', async () => {
    const route = { kind: 'audio', bookId } as const;

    expect(audioRoute.list(bookId)).toEqual(singers.length ? [route] : []);
    expect(Boolean(await audioRoute.load(route, getBooksMap()[bookId]))).toBe(singers.length > 0);
  });

  it('has a page per singer', () => {
    expect(audioSingerRoute.list(bookId)).toEqual(
      singers.map((singer) => ({ kind: 'audio-singer', bookId, singerId: singer.id }))
    );
  });
});

describe('audioSingerRoute', () => {
  it('has no page for an unknown singer', async () => {
    const route = { kind: 'audio-singer', bookId: AUDIO_BOOK, singerId: 'no-such-singer' } as const;

    expect(await audioSingerRoute.load(route, getBooksMap()[AUDIO_BOOK])).toBeNull();
  });

  it('marks the singer in the JSON-LD, the audio index marks none', async () => {
    const [singer] = getSingers(AUDIO_BOOK);
    const singerPage = await loadPage(
      { kind: 'audio-singer', bookId: AUDIO_BOOK, singerId: singer.id },
      'audio-singer'
    );
    const indexPage = await loadPage({ kind: 'audio', bookId: AUDIO_BOOK }, 'audio');
    const ofSinger = audioSingerRoute.jsonLd(singerPage) as ReactElement<{ selected?: TSinger }>;
    const ofIndex = audioRoute.jsonLd(indexPage) as ReactElement<{ selected?: TSinger }>;

    expect(ofSinger.type).toBe(LdJsonAudio);
    expect(ofSinger.props.selected).toEqual(singer);
    expect(ofIndex.type).toBe(LdJsonAudio);
    expect(ofIndex.props.selected).toBeUndefined();
  });
});
