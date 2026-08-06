import { notFound } from 'next/navigation';

import { buildExportHtml } from '@/lib/export';
import ExportView from '@/components/export/ExportView';
import { getBookIdParamList } from '@/lib/books';

import type { BookListPageProps } from '@/types/book';
import type { Metadata } from 'next';

/**/
export const dynamicParams = false;
export const generateStaticParams = getBookIdParamList;

/**/
export async function generateMetadata({
  params
}: BookListPageProps): Promise<Metadata> {
  const { bookId } = await params;
  return {
    robots: { index: false, follow: false }
  };
}

/**
 * Whole songbook as one near-raw HTML document for word-processor import.
 * Intentionally rendered without the site Layout.
 */
async function ExportPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  if (!bookId) return notFound();

  const { body, lang, title } = await buildExportHtml(bookId);

  return (
    <ExportView
      body={body}
      fileName={`Songbook-Export-${bookId}`}
      lang={lang}
      title={title}
    />
  );
}

/**/
export default ExportPage;
