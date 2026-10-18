import type { Metadata } from 'next';

import { getAlt } from '@/other/metadata/helpers/getAlt';
import { getCommonMeta } from '@/other/metadata/helpers/getCommonMeta';
import { getOG } from '@/other/metadata/helpers/getOG';
import { getPageTitle } from '@/other/metadata/helpers/getPageTitle';
import { getSongbookPagePath, getSongbookPath } from '@/other/paths';
import { getTranslationsByBookId } from '@/other/i18n';
import { getTwitter } from '@/other/metadata/helpers/getTwitter';
import { ROBOTS } from '@/other/metadata/helpers/constants';

import type { TSongbookPage } from '@/other/paths';

/**/
type TPageMetaOptions = {
  bookId: string;
  descriptionKey: string;
  titleKey: string;
  page?: TSongbookPage;
};

/**
 *
 */
export function getPageMeta({
  bookId,
  descriptionKey,
  titleKey,
  page
}: TPageMetaOptions): Partial<Metadata> {
  const translate = getTranslationsByBookId(bookId);

  const description = translate(descriptionKey);
  const title = getPageTitle(translate(titleKey));

  const path = page
    ? getSongbookPagePath(bookId, page)
    : getSongbookPath(bookId);

  return {
    ...getCommonMeta(),
    alternates: getAlt(bookId, page),
    description: description,
    openGraph: getOG(bookId, description, title, path),
    robots: ROBOTS,
    title: title,
    twitter: getTwitter(bookId, description, title)
  } as Metadata;
}
