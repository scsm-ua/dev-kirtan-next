import { hasBookAudio } from '@/lib/audio';
import { getIndexesByBookId } from '@/lib/contents';
import { defineRootPage } from '@/lib/pageData/routes/rootPage';
import { getAzPageMeta } from '@/other/metadata/getAzPageMeta';
import { ROUTE_KIND } from '@/other/router/routes';

/** Index by first line: `/<bookId>/a-z/`. */
export const azRoute = defineRootPage(ROUTE_KIND.A_Z, {
  data: (bookId, book) => ({
    book,
    groups: getIndexesByBookId(bookId),
    hasAudio: hasBookAudio(bookId)
  }),
  ldKey: 'A_Z_PAGE',
  meta: getAzPageMeta,
  sitemap: { priority: 1 }
});
