import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { listRoutes, loadPageData } from '@/lib/pageData';
import { getBookBundleUrl, getRouteDataUrl, getRoutePath } from '@/other/router/routes';
import { getBookIds } from '@/tests/helpers/books';
import {
  getHtmlFile,
  listSiteFiles,
  readHtmlPageData,
  readJsonFile,
  readSiteFile,
  resolveSitePath
} from '@/tests/helpers/site';

import type { TBookBundle, TPageData, TRoute, TSharedAssets } from '@/types/pageData';

/**
 * The page data of the build: one loader gives the HTML pages, the
 * `/data/**.json` files and the offline bundle, so all three must agree with
 * each other and with `loadPageData` on the same books.
 */

// As in `next build`: lib/ caches the book files.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const toFile = (url: string) => url.replace(/^\/+/, '');

/** Build ids differ between the build and this test run; everything else must not. */
const withoutBuild = (page: TPageData) => ({ ...page, build: '' });

describe.each(getBookIds())('page data of %s', (bookId) => {
  const routes = listRoutes(bookId);
  const files = new Map(routes.map((route) => [route, toFile(getRouteDataUrl(route))]));
  let built: Map<TRoute, TPageData>;

  beforeAll(() => {
    built = new Map(
      routes.flatMap((route) => (resolveSitePath(getRouteDataUrl(route)) ? [[route, readJsonFile<TPageData>(files.get(route))]] : []))
    );
  });

  /** Runs `check` for every route; a returned text is a problem. */
  const checkRoutes = (check: (route: TRoute) => string | false | Promise<string | false>) =>
    Promise.all(routes.map(async (route) => {
      const problem = await check(route);
      return problem ? `${getRoutePath(route)}: ${problem}` : [];
    })).then((problems) => expect(problems.flat()).toEqual([]));

  it('has a data file and an HTML page for every route', async () => {
    await checkRoutes((route) => {
      if (!built.has(route)) return `no ${files.get(route)}`;
      return !resolveSitePath(getRoutePath(route)) && 'no HTML page';
    });
  });

  it('has no data files of routes that do not exist', () => {
    const expected = [...files.values(), toFile(getBookBundleUrl(bookId))];

    expect(listSiteFiles(`data/${bookId}`).sort()).toEqual(expected.sort());
  });

  it('has the same data as loadPageData gives now', async () => {
    await checkRoutes(async (route) => {
      const file = built.get(route);
      const expected = await loadPageData(route);

      return (
        !!file &&
        JSON.stringify(withoutBuild(file)) !== JSON.stringify(withoutBuild(expected)) &&
        'differs from loadPageData (stale build? run `pnpm run build:test`)'
      );
    });
  });

  it('hydrates every HTML page from the same data as its data file', async () => {
    await checkRoutes((route) => {
      const file = built.get(route);
      const html = readHtmlPageData(readSiteFile(getHtmlFile(getRoutePath(route))));

      return !!file && JSON.stringify(html) !== JSON.stringify(file) && 'HTML page data differs from the data file';
    });
  });

  it('has a bundle with exactly the data files of the book', () => {
    const bundle = readJsonFile<TBookBundle>(toFile(getBookBundleUrl(bookId)));
    const expected = Object.fromEntries(routes.map((route) => [getRouteDataUrl(route), built.get(route)]));

    expect(bundle.build).toBe(built.get(routes[0]).build);
    expect(Object.keys(bundle.pages).sort()).toEqual(Object.keys(expected).sort());
    expect(bundle.pages).toEqual(expected);
  });

  it('lists in the bundle only asset files that exist in the build', () => {
    const { assets } = readJsonFile<TBookBundle>(toFile(getBookBundleUrl(bookId)));
    const missing = Object.values(assets).flat().filter((file) => !resolveSitePath(file));

    expect(missing).toEqual([]);
  });
});

describe('page data of the whole build', () => {
  it('carries one build id', () => {
    const ids = new Set(
      listSiteFiles('data').map((file) => readJsonFile<{ build: string }>(file).build)
    );

    expect(ids.size).toBe(1);
    expect([...ids][0]).toMatch(/^\w+@.+/);
  });
});

describe('/shell/assets.json', () => {
  it('lists the logos and covers, all of them files of the build', () => {
    const assets = readJsonFile<TSharedAssets>('shell/assets.json');

    expect([...assets.bookImages, ...assets.shell].filter((file) => !resolveSitePath(file))).toEqual([]);
    expect(assets.bookImages.length).toBeGreaterThan(0);
  });
});
