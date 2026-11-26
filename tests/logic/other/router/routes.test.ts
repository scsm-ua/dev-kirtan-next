import { describe, expect, it } from 'vitest';

import {
  getBookBundleUrl,
  getRouteDataUrl,
  getRouteFile,
  getRoutePath,
  parseDataFile,
  parsePath,
  ROUTE_KIND,
  ROUTES as ROUTE_TABLE
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

describe('ROUTE_KIND', () => {
  it('names every kind of the table, in table order', () => {
    expect(Object.values(ROUTE_KIND)).toEqual(Object.keys(ROUTE_TABLE));
  });

  // The values are in the page-data JSON (`kind`) and in analytics (`page_type`).
  it('keeps the values of the kinds', () => {
    expect(ROUTE_KIND).toEqual({
      BOOK_LIST: 'book-list',
      OTHER: 'other',
      CONTENTS: 'contents',
      A_Z: 'a-z',
      AUTHORS: 'authors',
      SEARCH: 'search',
      AUDIO: 'audio',
      AUDIO_SINGER: 'audio-singer',
      ITEM: 'item'
    });
  });
});

describe('match priority', () => {
  it('keeps the slug pattern last, so fixed segments win', () => {
    expect(Object.keys(ROUTE_TABLE).at(-1)).toBe('item');
  });

  it.each(['other', 'contents', 'a-z', 'authors', 'search', 'audio'] as const)(
    'takes "%s" for a root page, not for a slug',
    (kind) => {
      expect(parsePath(`/en/${kind}/`)).toEqual({ kind, bookId: 'en' });
    }
  );

  it('takes the audio index file before a singer', () => {
    expect(parseDataFile('en', 'audio/index.json')).toEqual({ kind: 'audio', bookId: 'en' });
  });

  it('takes file names that are no page path for a slug', () => {
    expect(parsePath('/en/index/')).toEqual({ kind: 'item', bookId: 'en', slug: 'index' });
    expect(parseDataFile('en', 'audio.json')).toEqual({ kind: 'item', bookId: 'en', slug: 'audio' });
  });
});

describe('pattern params', () => {
  it('reads a param from the page path and from the data file', () => {
    const route = { kind: 'audio-singer', bookId: 'en', singerId: 'some-singer' };

    expect(parsePath('/en/audio/some-singer/')).toEqual(route);
    expect(parseDataFile('en', 'audio/some-singer.json')).toEqual(route);
  });

  it('does not match a fixed segment in place of a param', () => {
    expect(parsePath('/en/contents/some-singer/')).toBeNull();
    expect(parseDataFile('en', 'contents/some-singer.json')).toBeNull();
  });
});

describe('data file names', () => {
  it.each(ROUTES.map(([route]) => route))('parseDataFile reverses getRouteFile for %o', (route) => {
    expect(parseDataFile(route.bookId, getRouteFile(route))).toEqual(route);
  });

  it.each(['some-song', 'some-song.txt', '.json', '', 'audio/.json', '/some-song.json', 'a/b/c.json'])(
    'rejects "%s"',
    (file) => {
      expect(parseDataFile('en', file)).toBeNull();
    }
  );
});
