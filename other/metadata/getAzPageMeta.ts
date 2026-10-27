import type { Metadata } from 'next';

import { getPageMeta } from '@/other/metadata/helpers/getPageMeta';
import { SONGBOOK_PAGE } from '@/other/paths';
import type { BookListPageProps } from '@/types/book';

/**
 *
 */
export async function getAzPageMeta({
  params
}: BookListPageProps): Promise<Partial<Metadata>> {
  const { bookId } = await params;

  return getPageMeta({
    bookId,
    descriptionKey: 'A_Z_PAGE.HEAD.DESCRIPTION',
    page: SONGBOOK_PAGE.A_Z
  });
}
