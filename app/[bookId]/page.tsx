import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getBookIdParamList } from '@/lib/books';
import { getBookListPageMeta } from '@/other/metadata/getBookListPageMeta';
import { loadPageData } from '@/lib/pageData';
import LdJson from '@/other/metadata/LdJson';

import type { BookListPageProps } from '@/types/book';

/**/
export const dynamicParams = false;
export const generateMetadata = getBookListPageMeta;
/* See the comments in the `app/layout.tsx` file. */
export const generateStaticParams = getBookIdParamList;

/**
 *
 */
async function BookListPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const page = await loadPageData({ kind: 'book-list', bookId });
  if (!page) notFound();

  return (
    <AppDocument
      extras={<LdJson bookId={bookId} pageKey="BOOK_LIST_PAGE" />}
      page={page}
    />
  );
}

/**/
export default BookListPage;
