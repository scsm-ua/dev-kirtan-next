import { getAboutLink } from '@/lib/about';
import { getBooksMap } from '@/lib/books';
import { defineRootPage } from '@/lib/pageData/routes/rootPage';
import { getBookListPageMeta } from '@/other/metadata/getBookListPageMeta';
import { ROUTE_KIND } from '@/other/router/routes';

/** Songbook list of a book: `/<bookId>/`. */
export const bookListRoute = defineRootPage(ROUTE_KIND.BOOK_LIST, {
  data: (bookId) => ({
    about: getAboutLink(bookId) ?? undefined,
    booksMap: getBooksMap()
  }),
  ldKey: 'BOOK_LIST_PAGE',
  meta: getBookListPageMeta,
  sitemap: { freq: 'monthly', priority: 0.9 }
});
