import { afterAll, describe, expect, it, vi } from 'vitest';

import { getSingers } from '@/lib/audio';
import { loadPageData } from '@/lib/pageData';
import { defineDataHandler } from '@/lib/pageData/dataHandler';
import { getBookIds, getItems } from '@/tests/helpers/books';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const AUDIO_BOOK = getBookIds().find((bookId) => getSingers(bookId).length > 0);
const request = new Request('http://localhost/');
const get = (folder: string, bookId: string, file: string) =>
  defineDataHandler(folder).GET(request, { params: Promise.resolve({ bookId, file }) });

describe('defineDataHandler', () => {
  it('lists the files of the book folder: root pages and items, no audio', () => {
    const params = defineDataHandler('').generateStaticParams();
    const files = params.filter(({ bookId }) => bookId === AUDIO_BOOK).map(({ file }) => file);
    const slugs = [...new Set(getItems(AUDIO_BOOK).map((item) => item.id))];

    expect(files).toEqual([
      'index.json',
      'other.json',
      'contents.json',
      'a-z.json',
      'authors.json',
      'search.json',
      ...slugs.map((slug) => `${slug}.json`)
    ]);
    expect([...new Set(params.map(({ bookId }) => bookId))]).toEqual(getBookIds());
  });

  it('lists the files of the audio folder without the folder, only for books with audio', () => {
    const params = defineDataHandler('audio').generateStaticParams();
    const audioBookIds = getBookIds().filter((bookId) => getSingers(bookId).length > 0);

    expect([...new Set(params.map(({ bookId }) => bookId))]).toEqual(audioBookIds);
    expect(params.filter(({ bookId }) => bookId === AUDIO_BOOK).map(({ file }) => file)).toEqual([
      'index.json',
      ...getSingers(AUDIO_BOOK).map((singer) => `${singer.id}.json`)
    ]);
  });

  it('answers a file of its folder with the page data of that route', async () => {
    const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
    const contents = await get('', AUDIO_BOOK, 'contents.json');
    const audio = await get('audio', AUDIO_BOOK, 'index.json');

    expect(await contents.json()).toEqual(plain(await loadPageData({ kind: 'contents', bookId: AUDIO_BOOK })));
    expect(await audio.json()).toEqual(plain(await loadPageData({ kind: 'audio', bookId: AUDIO_BOOK })));
  });

  it.each([
    ['an unknown file', '', 'no-such-item.json'],
    ['a file without .json', '', 'contents'],
    ['an unknown singer', 'audio', 'no-such-singer.json']
  ])('answers 404 for %s', async (_name, folder, file) => {
    expect((await get(folder, AUDIO_BOOK, file)).status).toBe(404);
  });
});
