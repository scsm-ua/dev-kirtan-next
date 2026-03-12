import type { MetadataRoute } from 'next';

import { getBookIdList } from '@/lib/books';
import { getContentsByBookId } from '@/lib/contents';
import { PATH, SITE } from '@/other/constants';

import type { TContentGroup, TContentItem } from '@/types/common';

/**/
export const dynamic = 'force-static';

/**
 *
 */
function mapGroups(groups: TContentGroup[], bookId) {
  const indexes = [
    getXmlItem(bookId + PATH.PAGE.BOOK_LIST, 0.9, 'monthly'),
    getXmlItem(bookId + PATH.PAGE.CONTENTS, 1),
    getXmlItem(bookId + PATH.PAGE.A_Z, 1),
    getXmlItem(bookId + PATH.PAGE.AUTHORS, 1)
  ];

  const items = groups.flatMap((g: TContentGroup) =>
    g.items.map((item: TContentItem) =>
      getXmlItem(bookId + '/' + item.id, 0.8, 'monthly')
    )
  );

  return [...indexes, ...items];
}

/**
 *
 */
async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const bookIds = await getBookIdList();

  return Promise.all(
    bookIds.map((bookId) => getContentsByBookId(bookId))
  )
    .then((contentsArr: Array<TContentGroup[]>) =>
      contentsArr.flatMap((groups: TContentGroup[], idx: number) =>
        mapGroups(groups, bookIds[idx])
      )
    )
    .catch(console.error) as any;
}

/**
 *
 */
function getXmlItem(path: string, priority: number, freq = 'weekly') {
  return {
    url: SITE.ORIGIN + path,
    changeFrequency: freq,
    priority: priority
  };
}

/**/
export default sitemap;
