import { getAudioSingerPageMeta, getAudioPageMeta } from '@/other/metadata/getAudioPageMeta';
import { getAuthorsPageMeta } from '@/other/metadata/getAuthorsPageMeta';
import { getAzPageMeta } from '@/other/metadata/getAzPageMeta';
import { getBookListPageMeta } from '@/other/metadata/getBookListPageMeta';
import { getBooksMap } from '@/lib/books';
import { getBuildId } from '@/other/router/buildId';
import { getContentsPageMeta } from '@/other/metadata/getContentsPageMeta';
import { getSearchPageMeta } from '@/other/metadata/getSearchPageMeta';
import {
  getAuthorsByBookId,
  getContentItemBySlug,
  getContentsByBookId,
  getIndexesByBookId
} from '@/lib/contents';
import { getSingers, getSingerTracks, hasBookAudio } from '@/lib/audio';
import { getBookDescriptionsByBook, getNavItems, getTelegraphUrl } from '@/lib/song';
import { getPagesList } from '@/lib/search';
import { pageHandler } from '@/lib/content/page';
import { renderMarkdownBody } from '@/other/markdown';
import { songHandler } from '@/lib/content/song';
import { translate } from '@/other/i18n';
import { ITEM_TYPE } from '@/types/common';

import type { Metadata } from 'next';
import type { TBookDescription } from '@/types/book';
import type { TContentGroup, TContentItem } from '@/types/common';
import type { THead, TPageData, TPageDataOf, TPageKind, TRoute } from '@/types/pageData';

/**
 * Builds the content of one page-data file, or `null` when the route has no
 * page (unknown book, slug or singer). React-free: everything the views need
 * that depends on the filesystem or on server-only code is resolved here.
 */
export async function loadPageData(route: TRoute): Promise<TPageData | null> {
  const { bookId } = route;
  const book = getBooksMap()[bookId];
  if (!book) return null;

  const params = Promise.resolve({ bookId });

  switch (route.kind) {
    case 'book-list':
      return make(route, 'book-list', toHead(await getBookListPageMeta({ params })), {
        booksMap: getBooksMap()
      });

    case 'contents':
      return make(route, 'contents', toHead(await getContentsPageMeta({ params })), {
        book,
        groups: getContentsByBookId(bookId),
        hasAudio: hasBookAudio(bookId)
      });

    case 'a-z':
      return make(route, 'a-z', toHead(await getAzPageMeta({ params })), {
        book,
        groups: getIndexesByBookId(bookId),
        hasAudio: hasBookAudio(bookId)
      });

    case 'authors':
      return make(route, 'authors', toHead(await getAuthorsPageMeta({ params })), {
        book,
        ...getAuthorsData(bookId)
      });

    case 'search':
      return make(route, 'search', toHead(await getSearchPageMeta({ params })), {
        book,
        pages: getPagesList(bookId)
      });

    case 'audio':
      if (!hasBookAudio(bookId)) return null;
      return make(route, 'audio', toHead(await getAudioPageMeta({ params })), {
        book,
        singers: getSingers(bookId),
        tracks: getSingerTracks(bookId)
      });

    case 'audio-singer': {
      const { singerId } = route;
      const singers = getSingers(bookId);
      const selected = singers.find((singer) => singer.id === singerId);
      if (!selected) return null;

      const meta = await getAudioSingerPageMeta({ params: Promise.resolve({ bookId, singerId }) });
      return make(route, 'audio-singer', toHead(meta), {
        book,
        selected,
        singers,
        tracks: getSingerTracks(bookId, singerId)
      });
    }

    case 'item':
      return loadItem(route, book);
  }
}

/**
 * Authors page groups. Songs show by first line (the title stays as a tooltip);
 * songs without an author go into a separate `unknown` group.
 */
export function getAuthorsData(bookId: string): {
  groups: Array<TContentGroup>;
  unknown?: TContentGroup;
} {
  const contents = getAuthorsByBookId(bookId);
  const noAuthor = contents.find((g: TContentGroup) => !g.name && g.items.length > 0);

  return {
    groups: contents.filter((g: TContentGroup) => g.name).map(byFirstLine),
    unknown: noAuthor
      ? byFirstLine({
          items: noAuthor.items,
          name: translate(bookId, 'AUTHORS_PAGE.UNKNOWN_AUTHOR')
        })
      : undefined
  };
}

/** Order comes pre-sorted from authors.json. */
function byFirstLine(group: TContentGroup): TContentGroup {
  const items = group.items.map((item: TContentItem) => ({
    ...item,
    title: item.aliasName || item.title,
    aliasName: item.title
  }));
  return { ...group, items };
}

/**
 * Song or markdown page, resolved through the item's `type` like the shared
 * content route does.
 */
async function loadItem(
  route: Extract<TRoute, { kind: 'item' }>,
  book: TBookDescription
): Promise<TPageData | null> {
  const { bookId, slug } = route;
  const item = getContentItemBySlug(bookId, slug);
  if (!item) return null;

  const nav = await getNavItems(slug, bookId);

  if (item.type === ITEM_TYPE.PAGE) {
    const page = await pageHandler.load(slug, bookId);
    if (!page) return null;

    const head = toHead(await pageHandler.getMeta(page, { bookId, slug }));
    return make(route, 'page', head, {
      book,
      nav,
      page: { bodyHtml: renderMarkdownBody(page.body), meta: page.meta }
    });
  }

  const song = await songHandler.load(slug, bookId);
  if (!song) return null;

  const head = toHead(await songHandler.getMeta(song, { bookId, slug }));
  return make(route, 'song', head, {
    book,
    descriptions: getBookDescriptionsByBook(slug, getBooksMap()),
    nav,
    song,
    telegraphUrl: await getTelegraphUrl(bookId, slug)
  });
}

/**/
function make<TKind extends TPageKind>(
  route: TPageDataOf<TKind>['route'],
  kind: TKind,
  head: THead,
  data: TPageDataOf<TKind>['data']
): TPageDataOf<TKind> {
  return { build: getBuildId(), data, head, kind, route } as TPageDataOf<TKind>;
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
