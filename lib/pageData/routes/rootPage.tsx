import LdJson from '@/other/metadata/LdJson';
import { ROUTE_KIND } from '@/other/router/routes';

import type { Metadata } from 'next';
import type { BookListPageProps, TBookDescription } from '@/types/book';
import type { TLdJsonPageKey } from '@/other/metadata/LdJson';
import type { TSongbookPage } from '@/other/paths';
import type { TPageDataOf } from '@/types/pageData';
import type { TRouteKind, TRouteOf, TServerRoute } from '@/lib/pageData/routes/types';

/** Kinds with one page per book and no route params. */
type TRootKind = {
  [K in TRouteKind]: keyof TRouteOf<K> extends 'kind' | 'bookId' ? K : never;
}[TRouteKind];

type TRootRoute = { bookId: string; kind: TRootKind };

type TOptions<K extends TRootKind> = {
  /** Data of the page; all server work is done here. */
  data(bookId: string, book: TBookDescription): TPageDataOf<K>['data'];
  /** Translations key of the JSON-LD (`<key>.SCHEMA.*`); without it the page has none. */
  ldKey?: TLdJsonPageKey;
  meta(props: BookListPageProps): Promise<Partial<Metadata>>;
  sitemap?: TServerRoute<K>['sitemap'];
};

/**
 * Route object of a page every book has exactly once: `/<bookId>/` and
 * `/<bookId>/<kind>/`.
 */
export function defineRootPage<K extends TRootKind>(
  kind: K,
  { data, ldKey, meta, sitemap }: TOptions<K>
): TServerRoute<K> {
  // The songbook list is the book root: it has no page segment.
  const page: TSongbookPage | undefined =
    kind === ROUTE_KIND.BOOK_LIST ? undefined : (kind as Exclude<TRootKind, 'book-list'>);

  // Written for the plain root route; `K` only picks the data type.
  const serverRoute = {
    jsonLd: ldKey
      ? ({ route }: { route: TRootRoute }) => (
          <LdJson bookId={route.bookId} page={page} pageKey={ldKey} />
        )
      : undefined,
    list: (bookId: string) => [{ kind, bookId }],
    load: async ({ bookId }: TRootRoute, book: TBookDescription) => ({
      data: data(bookId, book),
      kind
    }),
    meta: ({ bookId }: TRootRoute) => meta({ params: Promise.resolve({ bookId }) }),
    sitemap
  };

  return serverRoute as unknown as TServerRoute<K>;
}
