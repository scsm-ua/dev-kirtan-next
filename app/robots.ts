import type { MetadataRoute } from 'next';
import { getBookIdList, getBookDescriptionById } from '@/lib/books';
import { FILES, SITE } from '@/other/constants';
import { getSongbookPath } from '@/other/paths';

/**/
export const dynamic = 'force-static';

/**
 *
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      ...(process.env.NEXT_PUBLIC_ENV === 'production'
        ? {
            allow: '/',
            disallow: [
              '/*/search/', '/data/', '/shell/',
              ...getBookIdList()
                .filter((bookId) => getBookDescriptionById(bookId).hidden)
                .map(getSongbookPath)
            ]
          }
        : { disallow: '/' })
    },
    sitemap: encodeURI(SITE.ORIGIN + FILES.SITEMAP)
  };
}
