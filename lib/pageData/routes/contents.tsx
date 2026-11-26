import { hasBookAudio } from '@/lib/audio';
import { getContentsByBookId } from '@/lib/contents';
import { defineRootPage } from '@/lib/pageData/routes/rootPage';
import { getContentsPageMeta } from '@/other/metadata/getContentsPageMeta';
import { ROUTE_KIND } from '@/other/router/routes';

/** Contents: `/<bookId>/contents/`. */
export const contentsRoute = defineRootPage(ROUTE_KIND.CONTENTS, {
  data: (bookId, book) => ({
    book,
    groups: getContentsByBookId(bookId),
    hasAudio: hasBookAudio(bookId)
  }),
  ldKey: 'CONTENTS_PAGE',
  meta: getContentsPageMeta,
  sitemap: { priority: 1 }
});
