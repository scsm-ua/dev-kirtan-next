import { getBuildId } from '@/other/router/buildId';
import { getRouteDataUrl } from '@/other/router/routes';

import type { TPageData, TRoute } from '@/types/pageData';

/** Dev reads fresh source data on every navigation. */
const IS_DEV = process.env.NODE_ENV === 'development';

const cache = new Map<string, TPageData>();
const inflight = new Map<string, Promise<TPageData>>();

/**
 * Page data of a route. Rejects on network errors, missing files and data
 * from another build; callers fall back to a full document load.
 */
export function loadRoute(route: TRoute): Promise<TPageData> {
  const url = getRouteDataUrl(route);
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);

  let request = inflight.get(url);
  if (!request) {
    request = fetchPage(url).finally(() => inflight.delete(url));
    inflight.set(url, request);
  }
  return request;
}

/** Warms the cache; errors are ignored (navigation will retry). */
export function prefetchRoute(route: TRoute): void {
  if (IS_DEV) return;
  loadRoute(route).catch(() => {});
}

/** Stores page data that arrived with the document. */
export function seedRoute(page: TPageData): void {
  if (!IS_DEV) cache.set(getRouteDataUrl(page.route), page);
}

/**/
async function fetchPage(url: string): Promise<TPageData> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Page data ${response.status}: ${url}`);

  const page = (await response.json()) as TPageData;
  // Dev rebuilds continuously, so there is no single build id to compare.
  if (!IS_DEV && page.build !== getBuildId()) throw new Error(`Stale page data: ${url}`);

  if (!IS_DEV) cache.set(url, page);
  return page;
}
