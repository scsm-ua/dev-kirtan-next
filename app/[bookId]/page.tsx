import BookList from '@/components/home/BookList/BookList';
import { getBookIdParamList, getBooksMap } from '@/lib/books';
import { getBookListPageMeta } from '@/other/metadata/getBookListPageMeta';
import Layout from '@/components/common/Layout/Layout';
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
  const booksMap = getBooksMap();

  return (
    <Layout bookId={bookId}>
      <BookList bookId={bookId} booksMap={booksMap} />

      <LdJson
        bookId={bookId}
        pageKey="BOOK_LIST_PAGE"
      />
    </Layout>
  );
}

/**/
export default BookListPage;
