import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getBookIdParamList } from '@/lib/books';
import { getSearchPageMeta } from '@/other/metadata/getSearchPageMeta';
import { loadPageData } from '@/lib/pageData';
import { SONGBOOK_PAGE } from '@/other/paths';

import type { BookListPageProps } from '@/types/book';

/**/
export const generateMetadata = getSearchPageMeta;
export const generateStaticParams = getBookIdParamList;

/**
 *
 */
async function SearchPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const page = await loadPageData({ kind: SONGBOOK_PAGE.SEARCH, bookId });
  if (!page) notFound();

  return <AppDocument page={page} />;
}

/**/
export default SearchPage;
