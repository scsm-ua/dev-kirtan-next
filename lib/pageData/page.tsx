import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getBookIdList } from '@/lib/books';
import { loadPageData } from '@/lib/pageData/loaders';
import { SERVER_ROUTES } from '@/lib/pageData/routes';

import type { Metadata } from 'next';
import type { TRouteKind, TRouteOf } from '@/lib/pageData/routes/types';

/**
 * Body of the HTML page file of one route kind (a `page.tsx` under
 * `app/[bookId]/`). The
 * page file only names the kind (Next needs the file and a literal
 * `dynamicParams`); everything else comes from the route object.
 */
export function definePage<K extends TRouteKind>(kind: K) {
  type TParams = Omit<TRouteOf<K>, 'kind'>;

  const serverRoute = SERVER_ROUTES[kind];
  const toRoute = (params: TParams) => ({ kind, ...params }) as TRouteOf<K>;

  const toParams = (route: TRouteOf<K>): TParams => {
    const params: Partial<TRouteOf<K>> = { ...route };
    delete params.kind;

    return params as TParams;
  };

  return {
    /**/
    async generateMetadata({ params }: { params: Promise<TParams> }): Promise<Partial<Metadata>> {
      return serverRoute.meta(toRoute(await params));
    },

    /**
     * Next calls this once per `bookId` of the root layout; without that
     * param it lists the pages of every book.
     */
    generateStaticParams({ params }: { params?: { bookId?: string } } = {}): Array<TParams> {
      const bookIds = params?.bookId ? [params.bookId] : getBookIdList();

      return bookIds.flatMap((bookId) =>
        serverRoute.list(bookId).map((route) => toParams(route))
      );
    },

    /**/
    async Page({ params }: { params: Promise<TParams> }) {
      const page = await loadPageData(toRoute(await params));
      if (!page) notFound();

      return <AppDocument extras={serverRoute.jsonLd?.(page)} page={page} />;
    }
  };
}
