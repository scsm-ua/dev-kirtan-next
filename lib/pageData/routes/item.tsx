import { getBooksMap } from '@/lib/books';
import { pageHandler } from '@/lib/content/page';
import { songHandler } from '@/lib/content/song';
import { getContentItemBySlug, getContentsByBookId } from '@/lib/contents';
import { getBookDescriptionsByBook, getNavItems, getTelegraphUrl } from '@/lib/song';
import { renderMarkdownBody } from '@/other/markdown';
import { getContentMeta } from '@/other/metadata/getContentMeta';
import LdJsonPage from '@/other/metadata/LdJsonPage';
import LdJsonSong from '@/other/metadata/LdJsonSong';
import { ROUTE_KIND } from '@/other/router/routes';
import { ITEM_TYPE } from '@/types/common';

import type { ReactNode } from 'react';
import type { TBookDescription } from '@/types/book';
import type { TItemType } from '@/types/common';
import type { TPageDataOf } from '@/types/pageData';
import type { TNavItemsMap } from '@/types/song';
import type { TLoaded, TRouteOf, TServerRoute } from '@/lib/pageData/routes/types';

/** What one content type adds to the shared `/<bookId>/<slug>/` route. */
type TItemTypeDef<T extends TItemType> = {
  jsonLd(page: TPageDataOf<T>): ReactNode;
  /** Loads through the type's content handler; `data` holds pre-rendered values. */
  load(
    route: TRouteOf<'item'>,
    book: TBookDescription,
    nav: TNavItemsMap
  ): Promise<Extract<TLoaded<'item'>, { kind: T }> | null>;
};

/** A new content type is one entry here. */
const ITEM_TYPES: { [T in TItemType]: TItemTypeDef<T> } = {
  [ITEM_TYPE.SONG]: {
    jsonLd: ({ data, route }) => (
      <LdJsonSong
        bookDescriptions={data.descriptions}
        bookId={route.bookId}
        bookTitle={data.book.title}
        slug={route.slug}
        song={data.song}
      />
    ),

    async load({ bookId, slug }, book, nav) {
      const song = await songHandler.load(slug, bookId);
      if (!song) return null;

      return {
        data: {
          book,
          descriptions: getBookDescriptionsByBook(slug, getBooksMap()),
          nav,
          song,
          telegraphUrl: await getTelegraphUrl(bookId, slug)
        },
        kind: ITEM_TYPE.SONG,
        meta: await songHandler.getMeta(song, { bookId, slug })
      };
    }
  },

  [ITEM_TYPE.PAGE]: {
    jsonLd: ({ data, route }) => (
      <LdJsonPage
        bookId={route.bookId}
        bookTitle={data.book.title}
        slug={route.slug}
        title={data.page.meta.title}
      />
    ),

    async load({ bookId, slug }, book, nav) {
      const page = await pageHandler.load(slug, bookId);
      if (!page) return null;

      return {
        data: {
          book,
          nav,
          page: { bodyHtml: renderMarkdownBody(page.body), meta: page.meta }
        },
        kind: ITEM_TYPE.PAGE,
        meta: await pageHandler.getMeta(page, { bookId, slug })
      };
    }
  }
};

/**/
function getTypeDef(type: TItemType): TItemTypeDef<TItemType> {
  return ITEM_TYPES[type] as unknown as TItemTypeDef<TItemType>;
}

/**
 * Song or markdown page: `/<bookId>/<slug>/`. The real type comes from the
 * contents item and becomes the kind of the page data.
 */
export const itemRoute: TServerRoute<'item'> = {
  jsonLd: (page) => getTypeDef(page.kind).jsonLd(page),

  /** A song listed twice in the contents (page duplicates) has one URL. */
  list(bookId) {
    const slugs = new Set(
      getContentsByBookId(bookId).flatMap((group) => group.items.map((item) => item.id))
    );

    return Array.from(slugs, (slug) => ({ kind: ROUTE_KIND.ITEM, bookId, slug }));
  },

  async load(route, book) {
    const item = getContentItemBySlug(route.bookId, route.slug);
    if (!item) return null;

    const nav = await getNavItems(route.slug, route.bookId);

    // Items built before the `type` discriminator existed are songs.
    return getTypeDef(item.type ?? ITEM_TYPE.SONG).load(route, book, nav);
  },

  meta: ({ bookId, slug }) => getContentMeta({ params: Promise.resolve({ bookId, slug }) }),

  sitemap: { freq: 'monthly', priority: 0.8 }
};
