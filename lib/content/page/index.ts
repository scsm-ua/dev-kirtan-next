import { getPageBySlug } from '@/lib/page';
import { getIndexesByBookId } from '@/lib/contents';
import { getPageMeta } from '@/lib/content/page/meta';
import { renderPage } from '@/lib/content/page/export';
import { linkifySongRefs } from '@/lib/content/page/songRefs';
import {
  getImagesMeta,
  localizeResourceImages,
  type TImageRenderer
} from '@/lib/content/resourceImages';
import { renderImageTag } from '@/other/utils';
import { ITEM_TYPE } from '@/types/common';

import type { ContentHandler } from '@/lib/content/handler';
import type { TPage } from '@/types/page';

/**
 * Resource images become raw <img> tags (marked passes them through) so the
 * intrinsic width/height, when known, prevents layout shift.
 */
const renderPageImage: TImageRenderer = (alt, src, meta) =>
  renderImageTag(alt, src, meta);

/**
 * Rewrites authored relative links between source files, e.g.
 * `(./335-bengali.md)`, `(../songs/x.md)`, `(songs/x.md)` ->
 * `(/<bookId>/<slug>/)`. Slug = filename; the songs/pages dir is irrelevant.
 */
function linkifyRelativeLinks(body: string, bookId: string): string {
  return body.replace(
    /\]\((?:\.{1,2}\/)?(?:(?:songs|pages)\/)?([\w-]+)\.md\)/g,
    `](/${bookId}/$1/)`
  );
}

/**
 * Loads a page and linkifies indented "first line + page number" song
 * references and relative page links, so the app view and the export
 * share the same body.
 */
async function loadPage(slug: string, bookId: string): Promise<TPage | null> {
  const page = await getPageBySlug(slug, bookId);
  if (!page) return null;

  const indexes = getIndexesByBookId(bookId);
  const localized = localizeResourceImages(
    page.body,
    await getImagesMeta(),
    renderPageImage
  );
  const body = linkifyRelativeLinks(localized, bookId);
  return { ...page, body: linkifySongRefs(body, indexes, bookId) };
}

/**/
export const pageHandler: ContentHandler<TPage> = {
  type: ITEM_TYPE.PAGE,
  indexEntryClass: 'page',
  load: loadPage,
  getMeta: getPageMeta,
  renderExport: renderPage
};
