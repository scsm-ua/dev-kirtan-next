import type { MetadataRoute } from 'next';

import { getBookIdList, getBooksMap } from '@/lib/books';
import { getContentsByBookId } from '@/lib/contents';
import {
  getAbsoluteUrl,
  getSongbookPagePath,
  getSongbookPath,
  getSongPath,
  SONGBOOK_PAGE
} from '@/other/paths';

import type { TContentGroup, TContentItem } from '@/types/common';

/**/
export const dynamic = 'force-static';

/**
 *
 */
function mapGroups(groups: TContentGroup[], bookId) {
  const indexes = [
    getXmlItem(getSongbookPath(bookId), 0.9, 'monthly'),
    getXmlItem(getSongbookPagePath(bookId, SONGBOOK_PAGE.CONTENTS), 1),
    getXmlItem(getSongbookPagePath(bookId, SONGBOOK_PAGE.A_Z), 1),
    getXmlItem(getSongbookPagePath(bookId, SONGBOOK_PAGE.AUTHORS), 1)
  ];

  const items = groups.flatMap((g: TContentGroup) =>
    g.items.map((item: TContentItem) =>
      getXmlItem(getSongPath(bookId, item.id), 0.8, 'monthly')
    )
  );

  return [...indexes, ...items];
}

/**
 *
 */
async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const booksMap = getBooksMap();
  const bookIds = getBookIdList().filter((bookId) => !booksMap[bookId]?.hidden);

  return bookIds.flatMap((bookId) =>
    mapGroups(getContentsByBookId(bookId), bookId)
  );
}

/**
 *
 */
function getXmlItem(path: string, priority: number, freq: 'weekly' | 'monthly' = 'weekly') {
  return {
    url: getAbsoluteUrl(path), // Paths end with `/` to prevent redirects.
    changeFrequency: freq,
    priority: priority
  };
}

/**/
export default sitemap;
