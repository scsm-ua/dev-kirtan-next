import { afterAll, describe, expect, it, vi } from 'vitest';

import { getSingers } from '@/lib/audio';
import { getAudioPageMeta, getAudioSingerPageMeta } from '@/other/metadata/getAudioPageMeta';
import { translate } from '@/other/i18n';
import { getBookIds, getBooksMap } from '@/tests/helpers/books';

// As in `next build`: lib/ caches the audio of a book instead of re-reading every song.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const MAX_LENGTH = 160;
const audioBookIds = getBookIds().filter((bookId) => getSingers(bookId).length > 0);

describe.each(audioBookIds)('audio page meta of %s', (bookId) => {
  const book = getBooksMap()[bookId];
  const singers = getSingers(bookId);
  const intro = translate(bookId, 'AUDIO_PAGE.SCHEMA.DESCRIPTION').replace(/\.$/, '');

  it('names the book in the title of the audio page', async () => {
    const meta = await getAudioPageMeta({ params: Promise.resolve({ bookId }) });

    expect(meta.title).toContain(book.title_full_short || book.title);
    expect(meta.alternates.canonical).toBe(`/${bookId}/audio/`);
  });

  it('lists singers in the description, as many whole names as fit', async () => {
    const { description, openGraph, twitter } = await getAudioPageMeta({ params: Promise.resolve({ bookId }) });
    const names = description.slice(intro.length).replace(/^: /, '').replace(/…$/, '').split(', ');

    expect(description.startsWith(`${intro}: `)).toBe(true);
    expect(description.length).toBeLessThanOrEqual(MAX_LENGTH);
    expect(names).toEqual(singers.slice(0, names.length).map((singer) => singer.name));
    expect(description.endsWith('…')).toBe(names.length < singers.length);
    expect(openGraph.description).toBe(description);
    expect(twitter.description).toBe(description);
  });

  it('names the singer in the title and the description of a singer page', async () => {
    for (const singer of singers) {
      const params = Promise.resolve({ bookId, singerId: singer.id });
      const meta = await getAudioSingerPageMeta({ params });

      expect((meta.title as string).startsWith(`${singer.name} – `), singer.id).toBe(true);
      expect(meta.description.startsWith(`${singer.name} – `), singer.id).toBe(true);
      expect(meta.alternates.canonical, singer.id).toBe(`/${bookId}/audio/${singer.id}/`);
    }
  });

  it('falls back to the book title for an unknown singer', async () => {
    const params = Promise.resolve({ bookId, singerId: 'no-such-singer' });
    const meta = await getAudioSingerPageMeta({ params });

    expect(meta.title).toContain(book.title_full_short || book.title);
  });
});
