import { getCommonMeta } from '@/other/metadata/helpers/getCommonMeta';
import { getOG } from '@/other/metadata/helpers/getOG';
import { getSongPath } from '@/other/paths';
import { getTwitter } from '@/other/metadata/helpers/getTwitter';
import { getBookRobots } from '@/other/metadata/helpers/getBookRobots';

import type { Metadata } from 'next';
import type { TMetaCtx } from '@/lib/content/handler';
import type { TPage } from '@/types/page';

/**
 * Metadata for a markdown `page` item. Title comes from `meta.title`.
 */
export function getPageMeta(
  page: TPage,
  { bookId, slug }: TMetaCtx
): Partial<Metadata> {
  const title = page.meta.title;

  return {
    ...getCommonMeta(),
    alternates: {
      canonical: getSongPath(bookId, slug)
    },
    description: title,
    openGraph: getOG(bookId, title, title, getSongPath(bookId, slug), 'article'),
    robots: getBookRobots(bookId),
    title: title,
    twitter: getTwitter(bookId, title, title)
  } as Metadata;
}
