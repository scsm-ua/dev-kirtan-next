import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getBookIdParamList } from '@/lib/books';
import { getContentsPageMeta } from '@/other/metadata/getContentsPageMeta';
import { loadPageData } from '@/lib/pageData';
import LdJson from '@/other/metadata/LdJson';
import { SONGBOOK_PAGE } from '@/other/paths';

import type { BookListPageProps } from '@/types/book';

/**/
export const generateMetadata = getContentsPageMeta;
export const generateStaticParams = getBookIdParamList;

/**
 *
 */
async function ContentsPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const page = await loadPageData({ kind: SONGBOOK_PAGE.CONTENTS, bookId });
  if (!page) notFound();

  return (
    <AppDocument
      extras={<LdJson bookId={bookId} pageKey="CONTENTS_PAGE" page={SONGBOOK_PAGE.CONTENTS} />}
      page={page}
    />
  );
}

/**/
export default ContentsPage;
