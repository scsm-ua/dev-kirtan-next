import { afterAll, describe, expect, it, vi } from 'vitest';

import { listRoutes, loadPageData } from '@/lib/pageData';
import { getBuildId } from '@/other/router/buildId';
import { getRoutePath } from '@/other/router/routes';
import { getBookIds, getItems } from '@/tests/helpers/books';

import type { TPageData, TRoute } from '@/types/pageData';

/**
 * Rules for the page data of every route of every book: what the HTML pages
 * are rendered from and what `/data/**.json` contains.
 */

// As in `next build`: lib/ caches the book files, which makes the sweep 10× faster.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

describe.each(getBookIds())('page data of %s', (bookId) => {
  const routes = listRoutes(bookId);
  const itemTypes = new Map(getItems(bookId).map((item) => [item.id, item.type]));
  let pages: Array<[TRoute, TPageData | null]>;

  /** Runs `check` for every page; a returned text is a problem. */
  const checkPages = async (check: (page: TPageData, route: TRoute) => string | false) => {
    pages ??= await Promise.all(
      routes.map(async (route): Promise<[TRoute, TPageData | null]> => [route, await loadPageData(route)])
    );

    const problems = pages.flatMap(([route, page]) => {
      const problem = page ? check(page, route) : 'no page data';
      return problem ? [`${getRoutePath(route)}: ${problem}`] : [];
    });

    expect(problems).toEqual([]);
  };

  it('has the root pages and a page for every contents item', () => {
    const kinds = new Set(routes.map((route) => route.kind));

    expect([...kinds]).toEqual(expect.arrayContaining(['book-list', 'contents', 'a-z', 'authors', 'search']));
    expect(routes.filter((route) => route.kind === 'item')).toHaveLength(itemTypes.size);
  });

  it('loads every route', async () => {
    await checkPages(() => false);
  });

  it('answers the route it was asked for, with the kind of that route', async () => {
    await checkPages((page, route) => {
      const kind = route.kind === 'item' ? itemTypes.get(route.slug) : route.kind;

      if (page.kind !== kind) return `kind "${page.kind}" instead of "${kind}"`;
      return JSON.stringify(page.route) !== JSON.stringify(route) && 'another route';
    });
  });

  it('carries the build id', async () => {
    await checkPages((page) => page.build !== getBuildId() && 'another build id');
  });

  it('has a title, a description and its own path as the canonical', async () => {
    await checkPages((page, route) => {
      if (!page.head.title) return 'no title';
      if (!page.head.description) return 'no description';
      return page.head.canonical !== getRoutePath(route) && `canonical "${page.head.canonical}"`;
    });
  });

  it('is plain JSON', async () => {
    await checkPages(
      (page) => JSON.stringify(JSON.parse(JSON.stringify(page))) !== JSON.stringify(page) && 'changes in JSON'
    );
  });
});
