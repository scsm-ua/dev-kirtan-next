import type { Metadata } from 'next';

import AnalyzeTable from '@/components/analyze/AnalyzeTable';
import { getAnalyzeData } from '@/lib/analyze';
import { getBookIdParamList } from '@/lib/books';
import Layout from '@/components/common/Layout/Layout';

import type { BookListPageProps } from '@/types/book';

/** Admin-only page: keep it out of search engines. */
export const metadata: Metadata = {
  title: 'Analyze songbooks',
  robots: { index: false, follow: false }
};

/**/
export const generateStaticParams = getBookIdParamList;

/**
 *
 */
async function AnalyzePage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const data = await getAnalyzeData(bookId);

  return (
    <Layout bookId={bookId}>
      <div className="Main__container Analyze">
        <div className="Main__content">
          <AnalyzeTable data={data} />
        </div>
      </div>
    </Layout>
  );
}

/**/
export default AnalyzePage;
