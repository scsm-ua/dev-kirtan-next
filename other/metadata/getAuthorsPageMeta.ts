import type { Metadata } from 'next';

import { getPageMeta } from '@/other/metadata/helpers/getPageMeta';
import { SONGBOOK_PAGE } from '@/other/paths';
import type { BookListPageProps } from '@/types/book';

/**
 *
 */
export async function getAuthorsPageMeta({
  params
}: BookListPageProps): Promise<Partial<Metadata>> {
  const { bookId } = await params;

  return getPageMeta({
    bookId,
    descriptionKey: 'AUTHORS_PAGE.HEAD.DESCRIPTION',
    page: SONGBOOK_PAGE.AUTHORS
  });
}
