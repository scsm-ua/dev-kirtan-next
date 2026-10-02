import { OpenGraph } from 'next/dist/lib/metadata/types/opengraph-types';

import { getBannerUrlBase } from '@/other/helpers';
import { SITE } from '@/other/constants';

import type { TImage } from '@/types/resources';


/**
 * @param {string} bookId
 * @param {string} description
 * @param {string} title
 * @param {string} path*
 * @param {TImage} image* - song image meta, becomes the primary og:image.
 */
export function getOG(bookId, description, title, path?, image?: TImage): Partial<OpenGraph> {
  const imgBase = getBannerUrlBase(bookId);
  const url = SITE.ORIGIN + bookId + '/' + (path || '');

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

  if (image) {
    images.unshift({
      url: SITE.ORIGIN + image.src.replace(/^\//, ''),
      width: image.width,
      height: image.height,
      type: image.type
    });
  }

  return {
    title: title,
    description: description,
    url: url,
    siteName: SITE.NAME,
    locale: bookId.slice(0, 2), // todo: must be real locale, not just language
    type: 'website',
    images: images
  };
}
