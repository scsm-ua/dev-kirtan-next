import type { MetadataRoute } from 'next';

import { getBookIdList, getBookDescriptionById } from '@/lib/books';
import { listRoutes } from '@/lib/pageData';
import { SERVER_ROUTES } from '@/lib/pageData/routes';
import { getAbsoluteUrl } from '@/other/paths';
import { getRoutePath } from '@/other/router/routes';

/**/
export const dynamic = 'force-static';

/**
 * Every page of the visible books whose route object has a `sitemap` entry,
 * in the order of the URL table.
 */
async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getBookIdList()
    .filter((bookId) => !getBookDescriptionById(bookId).hidden)
    .flatMap((bookId) => listRoutes(bookId))
    .flatMap((route) => {
      const entry = SERVER_ROUTES[route.kind].sitemap;

      return entry
        ? [
            {
              url: getAbsoluteUrl(getRoutePath(route)), // Paths end with `/` to prevent redirects.
              changeFrequency: entry.freq ?? ('weekly' as const),
              priority: entry.priority
            }
          ]
        : [];
    });
}

/**/
export default sitemap;
