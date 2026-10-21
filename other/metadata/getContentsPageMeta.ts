import type { Metadata } from 'next';

import { getPageMeta } from '@/other/metadata/helpers/getPageMeta';
import { SONGBOOK_PAGE } from '@/other/paths';
import type { BookListPageProps } from '@/types/book';

/**
 *
 */
export async function getContentsPageMeta({
  params
}: BookListPageProps): Promise<Partial<Metadata>> {
  const { bookId } = await params;

  return getPageMeta({
    bookId,
    descriptionKey: 'CONTENTS_PAGE.HEAD.DESCRIPTION',
    titleKey: 'CONTENTS_PAGE.HEAD.TITLE',
    page: SONGBOOK_PAGE.CONTENTS
  });
}
