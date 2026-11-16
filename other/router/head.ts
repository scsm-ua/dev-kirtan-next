import { getAbsoluteUrl } from '@/other/paths';
import { getBookLocale } from '@/other/helpers';

import type { TPageData } from '@/types/pageData';

/**
 * Brings the document head in line with a page shown by client navigation.
 * Only what users and analytics see; crawlers always get the static HTML.
 */
export function applyHead(page: TPageData): void {
  const { canonical, description, title } = page.head;

  document.title = title;
  document.documentElement.lang = getBookLocale(page.route.bookId);
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  if (canonical) {
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', getAbsoluteUrl(canonical));
  }
}
