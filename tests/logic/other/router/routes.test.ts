import { describe, expect, it } from 'vitest';

import {
  getBookBundleUrl,
  getRouteDataUrl,
  getRouteFile,
  getRoutePath,
  parseAudioFile,
  parseItemFile,
  parsePath
} from '@/other/router/routes';

import { getBookIds } from '@/tests/helpers/books';

import type { TRoute } from '@/types/pageData';

/** One route of every kind, with its page URL and data URL. */
const ROUTES: Array<[route: TRoute, path: string, dataUrl: string]> = [
  [{ kind: 'book-list', bookId: 'en' }, '/en/', '/data/en/index.json'],
  [{ kind: 'contents', bookId: 'en' }, '/en/contents/', '/data/en/contents.json'],
  [{ kind: 'a-z', bookId: 'en' }, '/en/a-z/', '/data/en/a-z.json'],
  [{ kind: 'authors', bookId: 'en' }, '/en/authors/', '/data/en/authors.json'],
  [{ kind: 'other', bookId: 'en' }, '/en/other/', '/data/en/other.json'],
  [{ kind: 'search', bookId: 'en' }, '/en/search/', '/data/en/search.json'],
  [{ kind: 'audio', bookId: 'en' }, '/en/audio/', '/data/en/audio/index.json'],
  [
    { kind: 'audio-singer', bookId: 'en', singerId: 'some-singer' },
    '/en/audio/some-singer/',
    '/data/en/audio/some-singer.json'
  ],
  [{ kind: 'item', bookId: 'en-pe', slug: 'some-song' }, '/en-pe/some-song/', '/data/en-pe/some-song.json']
];

describe('route ↔ URL', () => {
  it.each(ROUTES)('%o', (route, pagePath, dataUrl) => {
    expect(getRoutePath(route)).toBe(pagePath);
    expect(getRouteDataUrl(route)).toBe(dataUrl);
    expect(parsePath(pagePath)).toEqual(route);
  });

  it('builds the bundle URL of a book', () => {
    expect(getBookBundleUrl('en')).toBe('/data/en/bundle.json');
  });
});

describe('parsePath', () => {
  it('decodes segments', () => {
    expect(parsePath('/en/some%20song/')).toEqual({ kind: 'item', bookId: 'en', slug: 'some song' });
  });

  it('takes the root page for the songbook list of the first songbook', () => {
    expect(parsePath('/')).toEqual({ kind: 'book-list', bookId: getBookIds()[0] });
  });

  it.each([
    ['no trailing slash', '/en'],
    ['no trailing slash on an item', '/en/some-song'],
    ['legacy .html', '/en/some-song.html'],
    ['file-like segment', '/en/file.json/'],
    ['analyze', '/en/analyze/'],
    ['export', '/en/export/'],
    ['shell', '/shell/'],
    ['test playground', '/test/player/'],
    ['data', '/data/en/'],
    ['next assets', '/_next/static/'],
    ['images', '/images/cover/'],
    ['404', '/404/'],
    ['too deep', '/en/some-song/extra/'],
    ['too deep under audio', '/en/audio/some-singer/extra/'],
    ['malformed encoding', '/en/%E0%A4%A/']
  ])('returns null for %s (%s)', (_name, pathname) => {
    expect(parsePath(pathname)).toBeNull();
  });
});

describe('data file names', () => {
  const itemRoutes = ROUTES.map(([route]) => route).filter(
    (route) => route.kind !== 'audio' && route.kind !== 'audio-singer'
  );
  const audioRoutes = ROUTES.map(([route]) => route).filter(
    (route) => route.kind === 'audio' || route.kind === 'audio-singer'
  );

  it.each(itemRoutes)('parseItemFile reverses getRouteFile for %o', (route) => {
    expect(parseItemFile(route.bookId, getRouteFile(route))).toEqual(route);
  });

  it.each(audioRoutes)('parseAudioFile reverses getRouteFile for %o', (route) => {
    const file = getRouteFile(route).replace(/^audio\//, '');

    expect(parseAudioFile(route.bookId, file)).toEqual(route);
  });

  it.each(['some-song', 'some-song.txt', '.json', ''])('rejects "%s"', (file) => {
    expect(parseItemFile('en', file)).toBeNull();
    expect(parseAudioFile('en', file)).toBeNull();
  });
});
