import { getContentsByBookId } from '@/lib/contents';
import { getBuildId } from '@/other/router/buildId';
import { getRouteDataUrl } from '@/other/router/routes';
import { getSingers, hasBookAudio } from '@/lib/audio';
import { loadPageData } from '@/lib/pageData/loaders';
import { SONGBOOK_PAGE } from '@/other/paths';

import type { TContentGroup } from '@/types/common';
import type { TBookBundle, TRoute } from '@/types/pageData';

export { loadPageData };

/** JSON response of a route's page data; 404 when the route has no page. */
export async function respondWithPageData(route: TRoute | null): Promise<Response> {
  const data = route && (await loadPageData(route));
  return data ? Response.json(data) : new Response('Not found', { status: 404 });
}

/**
 * Routes served by the items handler: book root, root pages, songs and pages.
 * Needs only `contents.json`.
 */
export function listItemRoutes(bookId: string): Array<TRoute> {
  const slugs = new Set<string>();
  getContentsByBookId(bookId).forEach((group: TContentGroup) =>
    group.items.forEach((item) => slugs.add(item.id))
  );

  return [
    { kind: 'book-list', bookId },
    { kind: SONGBOOK_PAGE.CONTENTS, bookId },
    { kind: SONGBOOK_PAGE.A_Z, bookId },
    { kind: SONGBOOK_PAGE.AUTHORS, bookId },
    { kind: SONGBOOK_PAGE.OTHER, bookId },
    { kind: SONGBOOK_PAGE.SEARCH, bookId },
    ...Array.from(slugs, (slug): TRoute => ({ kind: 'item', bookId, slug }))
  ];
}

/**
 * Routes served by the audio handler. Scans the book's songs, so it is kept
 * apart from `listItemRoutes`.
 */
export function listAudioRoutes(bookId: string): Array<TRoute> {
  if (!hasBookAudio(bookId)) return [];

  return [
    { kind: SONGBOOK_PAGE.AUDIO, bookId },
    ...getSingers(bookId).map((singer): TRoute => ({
      kind: 'audio-singer',
      bookId,
      singerId: singer.id
    }))
  ];
}

/** Every route that has page data. */
export function listRoutes(bookId: string): Array<TRoute> {
  return [...listItemRoutes(bookId), ...listAudioRoutes(bookId)];
}

/** All page data of a book, keyed by data URL. */
export async function loadBookBundle(bookId: string): Promise<TBookBundle> {
  const pages: TBookBundle['pages'] = {};
  for (const route of listRoutes(bookId)) {
    const page = await loadPageData(route);
    if (page) pages[getRouteDataUrl(route)] = page;
  }
  return { build: getBuildId(), pages };
}
