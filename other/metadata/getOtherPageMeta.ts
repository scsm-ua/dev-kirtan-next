import { getPageMeta } from '@/other/metadata/helpers/getPageMeta';
import { translate } from '@/other/i18n';
import { SONGBOOK_PAGE } from '@/other/paths';

import type { Metadata } from 'next';
import type { BookListPageProps } from '@/types/book';

export async function getOtherPageMeta({
  params
}: BookListPageProps): Promise<Partial<Metadata>> {
  const { bookId } = await params;

  return getPageMeta({
    bookId,
    descriptionKey: 'BOOK_LIST_PAGE.HEAD.DESCRIPTION',
    page: SONGBOOK_PAGE.OTHER,
    title: translate(bookId, 'BOOK_LIST_PAGE.OTHER_SONGBOOKS')
  });
}
