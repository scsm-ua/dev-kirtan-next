import { afterAll, describe, expect, it, vi } from 'vitest';

import { getSingers } from '@/lib/audio';
import {
  listAudioRoutes,
  listItemRoutes,
  listRoutes,
  getSharedAssets,
  loadBookBundle,
  loadPageData,
  respondWithPageData
} from '@/lib/pageData';
import { getBuildId } from '@/other/router/buildId';
import { getRouteDataUrl } from '@/other/router/routes';
import { getBookIds, getItems } from '@/tests/helpers/books';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

/** The book with the fewest items, to keep the bundle test quick. */
const SMALL_BOOK = getBookIds().reduce((a, b) => (getItems(a).length <= getItems(b).length ? a : b));

describe.each(getBookIds())('routes of %s', (bookId) => {
  it('lists the book root, the root pages and every item once', () => {
    const slugs = [...new Set(getItems(bookId).map((item) => item.id))];

    expect(listItemRoutes(bookId)).toEqual([
      { kind: 'book-list', bookId },
      { kind: 'contents', bookId },
      { kind: 'a-z', bookId },
      { kind: 'authors', bookId },
      { kind: 'other', bookId },
      { kind: 'search', bookId },
      ...slugs.map((slug) => ({ kind: 'item', bookId, slug }))
    ]);
  });

  it('lists the audio page and a page per singer', () => {
    const singers = getSingers(bookId);
    const expected = singers.length
      ? [
          { kind: 'audio', bookId },
          ...singers.map((singer) => ({ kind: 'audio-singer', bookId, singerId: singer.id }))
        ]
      : [];

    expect(listAudioRoutes(bookId)).toEqual(expected);
  });

  it('lists all of them together, each with its own data URL', () => {
    const routes = listRoutes(bookId);
    const urls = routes.map(getRouteDataUrl);

    expect(routes).toEqual([...listItemRoutes(bookId), ...listAudioRoutes(bookId)]);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('does not reserve an existing item slug for the other page', () => {
    expect(getItems(bookId).map((item) => item.id)).not.toContain('other');
  });
});

describe('respondWithPageData', () => {
  it('answers with the page data as JSON', async () => {
    const route = { kind: 'contents', bookId: SMALL_BOOK } as const;
    const response = await respondWithPageData(route);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(JSON.parse(JSON.stringify(await loadPageData(route))));
  });

  it.each([
    ['no route', null],
    ['a route without a page', { kind: 'item', bookId: SMALL_BOOK, slug: 'no-such-item' }]
  ] as const)('answers 404 for %s', async (_name, route) => {
    expect((await respondWithPageData(route)).status).toBe(404);
  });
});

describe('loadBookBundle', () => {
  it('holds the page data of every route of the book, keyed by data URL', async () => {
    const routes = listRoutes(SMALL_BOOK);
    const bundle = await loadBookBundle(SMALL_BOOK);

    expect(bundle.build).toBe(getBuildId());
    expect(Object.keys(bundle.pages).sort()).toEqual(routes.map(getRouteDataUrl).sort());

    for (const route of routes) {
      expect(bundle.pages[getRouteDataUrl(route)].route, getRouteDataUrl(route)).toEqual(route);
    }
  });

  it('lists the files to cache with the book: sorted, unique and site-relative', async () => {
    const { assets } = await loadBookBundle(SMALL_BOOK);

    for (const [name, files] of Object.entries(assets)) {
      expect(files, name).toEqual([...new Set(files)].sort());
      for (const file of files) expect(file, name).toMatch(/^\/images\/[^/]/);
    }

    expect(Object.keys(assets)).toEqual(['contentImages']);
    expect(assets.contentImages.every((file) => file.startsWith('/images/resources/'))).toBe(true);
  });

  it.each(getBookIds())('lists exactly the content images that the pages of %s show', async (bookId) => {
    const { assets, pages } = await loadBookBundle(bookId);
    const shown = new Set(JSON.stringify(pages).match(/\/images\/resources\/[^"'\\\s)]+/g));

    expect(assets.contentImages).toEqual([...shown].sort());
  });
});

describe('getSharedAssets', () => {
  it('lists the logos and the covers of all songbooks: sorted, unique and site-relative', () => {
    const assets = getSharedAssets();

    for (const [name, files] of Object.entries(assets)) {
      expect(files, name).toEqual([...new Set(files)].sort());
      for (const file of files) expect(file, name).toMatch(/^\/images\/[^/]/);
    }
    expect(assets.bookImages).toContain(`/images/cover/banner-${SMALL_BOOK}.jpg`);
    expect(assets.bookImages.every((file) => /^\/images\/(cover|thumbnail)\//.test(file))).toBe(true);
    expect(assets.shell).toContain('/images/svg/kirtan-site.svg');
  });
});
