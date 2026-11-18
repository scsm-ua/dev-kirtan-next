import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getBookIdParamList } from '@/lib/books';
import { loadPageData } from '@/lib/pageData';
import { getOtherPageMeta } from '@/other/metadata/getOtherPageMeta';
import { SONGBOOK_PAGE } from '@/other/paths';

import type { BookListPageProps } from '@/types/book';

export const dynamicParams = false;
export const generateMetadata = getOtherPageMeta;
export const generateStaticParams = getBookIdParamList;

async function OtherBooksPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const page = await loadPageData({ kind: SONGBOOK_PAGE.OTHER, bookId });
  if (!page) notFound();

  return <AppDocument page={page} />;
}

export default OtherBooksPage;