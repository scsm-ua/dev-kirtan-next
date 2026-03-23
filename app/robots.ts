import type { MetadataRoute } from 'next';
import { FILES, SITE } from '@/other/constants';

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
        ? { allow: '/' }
        : { disallow: '/' })
    },
    sitemap: encodeURI(SITE.ORIGIN + FILES.SITEMAP)
  };
}
