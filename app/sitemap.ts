import type { MetadataRoute } from 'next';

import { getBookIdList, getBookDescriptionById } from '@/lib/books';
import { getContentsByBookId } from '@/lib/contents';
import { getSingers, hasBookAudio } from '@/lib/audio';
import {
  getAbsoluteUrl,
  getAudioSingerPath,
  getSongbookPagePath,
  getSongbookPath,
  getSongPath,
  SONGBOOK_PAGE
} from '@/other/paths';

import type { TContentGroup, TContentItem } from '@/types/common';

/**/
export const dynamic = 'force-static';

/**
 *
 */
function mapGroups(groups: TContentGroup[], bookId) {
  const indexes = [
    getXmlItem(getSongbookPath(bookId), 0.9, 'monthly'),
    getXmlItem(getSongbookPagePath(bookId, SONGBOOK_PAGE.OTHER), 0.8),
    getXmlItem(getSongbookPagePath(bookId, SONGBOOK_PAGE.CONTENTS), 1),
    getXmlItem(getSongbookPagePath(bookId, SONGBOOK_PAGE.A_Z), 1),
    getXmlItem(getSongbookPagePath(bookId, SONGBOOK_PAGE.AUTHORS), 1)
  ];

  const audio = hasBookAudio(bookId)
    ? [
        getXmlItem(getSongbookPagePath(bookId, SONGBOOK_PAGE.AUDIO), 0.8),
        ...getSingers(bookId).map((singer) =>
          getXmlItem(getAudioSingerPath(bookId, singer.id), 0.8)
        )
      ]
    : [];

  // A song listed twice in the contents (page duplicates) has one URL.
  const slugs = new Set(
    groups.flatMap((g: TContentGroup) => g.items.map((item: TContentItem) => item.id))
  );
  const items = Array.from(slugs, (slug) =>
    getXmlItem(getSongPath(bookId, slug), 0.8, 'monthly')
  );

  return [...indexes, ...audio, ...items];
}

/**
 *
 */
async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getBookIdList()
    .filter((bookId) => !getBookDescriptionById(bookId).hidden)
    .flatMap((bookId) => mapGroups(getContentsByBookId(bookId), bookId));
}

/**
 *
 */
function getXmlItem(path: string, priority: number, freq: 'weekly' | 'monthly' = 'weekly') {
  return {
    url: getAbsoluteUrl(path), // Paths end with `/` to prevent redirects.
    changeFrequency: freq,
    priority: priority
  };
}

/**/
export default sitemap;
