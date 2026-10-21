import { getBannerUrlBase, getBookLocale } from '@/other/helpers';
import { getAbsoluteUrl, getSongbookPath } from '@/other/paths';
import { SITE } from '@/other/constants';

import type { Metadata } from 'next';

type TOpenGraph = NonNullable<Metadata['openGraph']>;
type TOGType = 'website' | 'music.song' | 'article';

/**
 * @param {string} bookId
 * @param {string} description
 * @param {string} title
 * @param {string} path* — full relative path (e.g. from getSongPath), with slashes
 * @param {TOGType} type* — defaults to `website`; song pages pass `music.song`
 */
export function getOG(bookId, description, title, path?, type: TOGType = 'website'): TOpenGraph {
  const imgBase = getBannerUrlBase(bookId);
  const url = getAbsoluteUrl(path || getSongbookPath(bookId));

  const images = [
    {
      url: imgBase + '.jpg',
      width: 320,
      height: 190,
      type: 'image/jpeg'
    },
    {
      url: imgBase + '@2.jpg',
      width: 640,
      height: 380,
      type: 'image/jpeg'
    }
  ];

  return {
    title: title,
    description: description,
    url: url,
    siteName: SITE.NAME,
    locale: getBookLocale(bookId),
    type: type,
    images: images
  } as TOpenGraph;
}
