import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getBookIdList, getFirstBookId } from '@/lib/books';
import { getBookListPageMeta } from '@/other/metadata/getBookListPageMeta';
import { getRootPendingScript } from '@/other/router/pickRootBookId';
import { loadPageData } from '@/lib/pageData';
import LdJson from '@/other/metadata/LdJson';

/** Head of the first songbook's list: its canonical is `/<firstBookId>/`, so `/` is not a duplicate. */
export function generateMetadata() {
  return getBookListPageMeta({ params: Promise.resolve({ bookId: getFirstBookId() }) });
}

/**
 * Root page: the songbook list of the first songbook, as a real app page
 * (content for search engines, a start page for the installed app). On start
 * the app moves the reader to their own songbook without a reload, see
 * `useAppRouter` and `pickRootBookId`.
 */
async function HomePage() {
  const bookId = getFirstBookId();
  const page = await loadPageData({ kind: 'book-list', bookId });
  if (!page) notFound();

  return (
    <AppDocument
      extras={<LdJson bookId={bookId} pageKey="BOOK_LIST_PAGE" />}
      head={<script dangerouslySetInnerHTML={{ __html: getRootPendingScript(getBookIdList()) }} />}
      page={page}
    />
  );
}

/**/
export default HomePage;
