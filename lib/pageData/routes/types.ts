import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import type { TBookDescription } from '@/types/book';
import type { TPageData, TRoute } from '@/types/pageData';

/**/
export type TRouteKind = TRoute['kind'];

/** Route of one kind. */
export type TRouteOf<K extends TRouteKind> = Extract<TRoute, { kind: K }>;

/** Page data a route of this kind can give: one kind, or `song` and `page` for `item`. */
export type TPageDataOfRoute<K extends TRouteKind> = Extract<TPageData, { route: TRouteOf<K> }>;

/**
 * What `load` returns: kind and data of the page. `meta` is set only when the
 * loader already has it (items), so the content is not loaded twice.
 */
export type TLoaded<K extends TRouteKind> =
  TPageDataOfRoute<K> extends infer P
    ? P extends TPageData
      ? { data: P['data']; kind: P['kind']; meta?: Partial<Metadata> }
      : never
    : never;

/**
 * Build side of one route kind (Node only). Everything the build knows about
 * the route is here: which pages exist, their metadata, data, JSON-LD and
 * sitemap entry.
 */
export type TServerRoute<K extends TRouteKind> = {
  /** JSON-LD of the static HTML. */
  jsonLd?(page: TPageDataOfRoute<K>): ReactNode;
  /** Routes of this kind the book has; empty when it has none. The only "exists" rule. */
  list(bookId: string): Array<TRouteOf<K>>;
  /** Kind and data of the page, or `null` when the route has no page. */
  load(route: TRouteOf<K>, book: TBookDescription): Promise<TLoaded<K> | null>;
  /** Next metadata; the client head is cut from it. */
  meta(route: TRouteOf<K>): Promise<Partial<Metadata>>;
  /** Sitemap entry; without it the page is not in the sitemap. */
  sitemap?: { freq?: 'weekly' | 'monthly'; priority: number };
};
