import { getBooksMap } from '@/lib/books';
import { defineRootPage } from '@/lib/pageData/routes/rootPage';
import { getOtherPageMeta } from '@/other/metadata/getOtherPageMeta';
import { ROUTE_KIND } from '@/other/router/routes';

/** Other songbooks: `/<bookId>/other/`. */
export const otherRoute = defineRootPage(ROUTE_KIND.OTHER, {
  data: () => ({ booksMap: getBooksMap() }),
  meta: getOtherPageMeta,
  sitemap: { priority: 0.8 }
});
