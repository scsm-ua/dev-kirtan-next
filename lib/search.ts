import { getContentsByBookId } from '@/lib/contents';
import { getSongPathWithPage } from '@/other/paths';
import type { TContentGroup, TContentItem } from '@/types/common';
import type { TPage } from '@/types/search';

/**
 *
 */
export function getPagesList(bookId: string): Promise<Array<TPage>> {
  const pagesMap = new Map<string, TPage>();

  return getContentsByBookId(bookId).then((groups: Array<TContentGroup>) => {
    groups.forEach((group: TContentGroup) =>
      group.items.forEach((item: TContentItem) =>
        item.pages.forEach((page: string) =>
          pagesMap.set(page, {
            page: page + '',
            path: getSongPathWithPage(bookId, item, page),
            title: item.title
          })
        )
      )
    );

    return Array.from(pagesMap)
      .sort(
        (a: [string, TPage], b: [string, TPage]) =>
          parseFloat(a[0]) - parseFloat(b[0])
      )
      .map((item: [string, TPage]) => item[1]);
  });
}
