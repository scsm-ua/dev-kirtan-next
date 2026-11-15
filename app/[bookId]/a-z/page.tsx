import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getAzPageMeta } from '@/other/metadata/getAzPageMeta';
import { getBookIdParamList } from '@/lib/books';
import { loadPageData } from '@/lib/pageData';
import LdJson from '@/other/metadata/LdJson';
import { SONGBOOK_PAGE } from '@/other/paths';

import type { BookListPageProps } from '@/types/book';

/**/
export const generateMetadata = getAzPageMeta;
export const generateStaticParams = getBookIdParamList;

/**
 *
 */
async function AZPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const page = await loadPageData({ kind: SONGBOOK_PAGE.A_Z, bookId });
  if (!page) notFound();

  return (
    <AppDocument
      extras={<LdJson bookId={bookId} pageKey="A_Z_PAGE" page={SONGBOOK_PAGE.A_Z} />}
      page={page}
    />
  );
}

/**/
export default AZPage;
