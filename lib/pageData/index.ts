import fs from 'node:fs';
import path from 'node:path';

import { getContentImages } from '@/lib/content/resourceImages';
import { loadPageData } from '@/lib/pageData/loaders';
import { SERVER_ROUTES } from '@/lib/pageData/routes';
import { getBuildId } from '@/other/router/buildId';
import { getRouteDataUrl, getRouteFolder, ROUTE_KINDS } from '@/other/router/routes';

import type { TBookBundle, TRoute, TSharedAssets } from '@/types/pageData';

export { loadPageData };

/** JSON response of a route's page data; 404 when the route has no page. */
export async function respondWithPageData(route: TRoute | null): Promise<Response> {
  const data = route && (await loadPageData(route));
  return data ? Response.json(data) : new Response('Not found', { status: 404 });
}

/**
 * Routes that have page data, in the order of the URL table. With `folder`,
 * only those whose data file is in that folder of `/data/<bookId>/` (`''` or
 * `'audio'`): the routes of one JSON handler. Kinds of other folders are not
 * listed at all, so `''` needs only `contents.json` and skips the audio scan.
 */
export function listRoutes(bookId: string, folder?: string): Array<TRoute> {
  return ROUTE_KINDS.filter((kind) => folder === undefined || getRouteFolder(kind) === folder).flatMap(
    (kind): Array<TRoute> => SERVER_ROUTES[kind].list(bookId)
  );
}

/**
 * Images every songbook shares: logos and the covers of all songbooks.
 * Served as `/shell/assets.json`; the service worker caches them on install.
 */
export function getSharedAssets(): TSharedAssets {
  return {
    bookImages: listPublicFiles('images/cover', 'images/thumbnail'),
    shell: listPublicFiles('images/svg')
  };
}

/** All page data of a book, keyed by data URL. */
export async function loadBookBundle(bookId: string): Promise<TBookBundle> {
  const pages: TBookBundle['pages'] = {};
  for (const route of listRoutes(bookId)) {
    const page = await loadPageData(route);
    if (page) pages[getRouteDataUrl(route)] = page;
  }
  return {
    assets: {
      contentImages: await getContentImages(bookId)
    },
    build: getBuildId(),
    pages
  };
}

/** Files directly in the given `public/` directories, as sorted site-relative paths. */
function listPublicFiles(...dirs: Array<string>): Array<string> {
  return dirs
    .flatMap((dir) =>
      fs
        .readdirSync(path.join(process.cwd(), 'public', dir), { withFileTypes: true })
        .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
        .map((entry) => `/${dir}/${entry.name}`)
    )
    .sort();
}
