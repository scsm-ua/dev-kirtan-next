import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getBookIdList, getFirstBookId } from '@/lib/books';
import { getRootPendingScript } from '@/other/router/pickRootBookId';
import { loadPageData } from '@/lib/pageData';
import { SERVER_ROUTES } from '@/lib/pageData/routes';
import { ROUTE_KIND } from '@/other/router/routes';

/** The root page is a `book-list` page with its own head script, so it is not a `definePage` stub. */
const bookList = SERVER_ROUTES[ROUTE_KIND.BOOK_LIST];

/** Head of the first songbook's list: its canonical is `/<firstBookId>/`, so `/` is not a duplicate. */
export function generateMetadata() {
  return bookList.meta({ kind: ROUTE_KIND.BOOK_LIST, bookId: getFirstBookId() });
}

/**
 * Root page: the songbook list of the first songbook, as a real app page
 * (content for search engines, a start page for the installed app). On start
 * the app moves the reader to their own songbook without a reload, see
 * `useAppRouter` and `pickRootBookId`.
 */
async function HomePage() {
  const bookId = getFirstBookId();
  const page = await loadPageData({ kind: ROUTE_KIND.BOOK_LIST, bookId });
  if (!page) notFound();

  return (
    <AppDocument
      extras={bookList.jsonLd?.(page)}
      head={<script dangerouslySetInnerHTML={{ __html: getRootPendingScript(getBookIdList()) }} />}
      page={page}
    />
  );
}

/**/
export default HomePage;
