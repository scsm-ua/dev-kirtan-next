import { getAuthorsByBookId } from '@/lib/contents';
import { defineRootPage } from '@/lib/pageData/routes/rootPage';
import { translate } from '@/other/i18n';
import { getAuthorsPageMeta } from '@/other/metadata/getAuthorsPageMeta';
import { ROUTE_KIND } from '@/other/router/routes';

import type { TContentGroup, TContentItem } from '@/types/common';

/** Authors: `/<bookId>/authors/`. */
export const authorsRoute = defineRootPage(ROUTE_KIND.AUTHORS, {
  data: (bookId, book) => ({ book, ...getAuthorsData(bookId) }),
  ldKey: 'AUTHORS_PAGE',
  meta: getAuthorsPageMeta,
  sitemap: { priority: 1 }
});

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
