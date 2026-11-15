import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getAuthorsPageMeta } from '@/other/metadata/getAuthorsPageMeta';
import { getBookIdParamList } from '@/lib/books';
import { loadPageData } from '@/lib/pageData';
import LdJson from '@/other/metadata/LdJson';
import { SONGBOOK_PAGE } from '@/other/paths';

import type { BookListPageProps } from '@/types/book';

/**/
export const generateMetadata = getAuthorsPageMeta;
export const generateStaticParams = getBookIdParamList;

/**
 *
 */
async function AuthorsPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const page = await loadPageData({ kind: SONGBOOK_PAGE.AUTHORS, bookId });
  if (!page) notFound();

  return (
    <AppDocument
      extras={<LdJson bookId={bookId} pageKey="AUTHORS_PAGE" page={SONGBOOK_PAGE.AUTHORS} />}
      page={page}
    />
  );
}

/**/
export default AuthorsPage;
