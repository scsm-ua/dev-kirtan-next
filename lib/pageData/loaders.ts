import { getBooksMap } from '@/lib/books';
import { SERVER_ROUTES } from '@/lib/pageData/routes';
import { getBuildId } from '@/other/router/buildId';

import type { Metadata } from 'next';
import type { THead } from '@/types/pageData';
import type {
  TPageDataOfRoute,
  TRouteKind,
  TRouteOf,
  TServerRoute
} from '@/lib/pageData/routes/types';

/**
 * Builds the content of one page-data file, or `null` when the route has no
 * page (unknown book, slug or singer). React-free: everything the views need
 * that depends on the filesystem or on server-only code is resolved by the
 * route object (`lib/pageData/routes/`).
 */
export async function loadPageData<K extends TRouteKind>(
  route: TRouteOf<K>
): Promise<TPageDataOfRoute<K> | null> {
  const book = getBooksMap()[route.bookId];
  if (!book) return null;

  const serverRoute = SERVER_ROUTES[route.kind] as unknown as TServerRoute<K>;
  const loaded = await serverRoute.load(route, book);
  if (!loaded) return null;

  const { data, kind, meta = await serverRoute.meta(route) } = loaded;

  return make(route, kind, toHead(meta), data);
}

/**/
function make<K extends TRouteKind>(
  route: TRouteOf<K>,
  kind: TPageDataOfRoute<K>['kind'],
  head: THead,
  data: TPageDataOfRoute<K>['data']
): TPageDataOfRoute<K> {
  return { build: getBuildId(), data, head, kind, route } as TPageDataOfRoute<K>;
}

/** Only plain values the client applies to the document head. */
function toHead(meta: Partial<Metadata>): THead {
  const canonical = meta.alternates?.canonical;

  return {
    canonical: typeof canonical === 'string' ? canonical : '',
    description: meta.description ?? '',
    title: typeof meta.title === 'string' ? meta.title : ''
  };
}
