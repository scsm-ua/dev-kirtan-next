import type { Metadata } from 'next';

import { getPageMeta } from '@/other/metadata/helpers/getPageMeta';
import type { BookListPageProps } from '@/types/book';

/**
 *
 */
export async function getBookListPageMeta({
  params
}: BookListPageProps): Promise<Partial<Metadata>> {
  const { bookId } = await params;

  return getPageMeta({
    bookId,
    descriptionKey: 'BOOK_LIST_PAGE.HEAD.DESCRIPTION'
  });
}
