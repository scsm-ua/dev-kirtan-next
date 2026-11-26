import { defineRootPage } from '@/lib/pageData/routes/rootPage';
import { getPagesList } from '@/lib/search';
import { getSearchPageMeta } from '@/other/metadata/getSearchPageMeta';
import { ROUTE_KIND } from '@/other/router/routes';

/** Search: `/<bookId>/search/`. Not in the sitemap. */
export const searchRoute = defineRootPage(ROUTE_KIND.SEARCH, {
  data: (bookId, book) => ({ book, pages: getPagesList(bookId) }),
  meta: getSearchPageMeta
});
