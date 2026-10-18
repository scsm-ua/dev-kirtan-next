import { NAV_SPAN } from '@/lib/content/exportHtml';
import { renderMarkdownBody } from '@/other/markdown';
import { SITE } from '@/other/constants';

import type { TPage } from '@/types/page';

/**
 * Markdown page section. Marked `.song.page` so it participates in category
 * retention + `onlyTranslated`, while `.page` lets the `withPages` filter
 * drop it (and its index entries) as a unit.
 */
export function renderPage(page: TPage, slug: string): string {
  // Internal links (song-refs, relative page links) point at app routes;
  // retarget them to in-document anchors within the export page.
  const body = renderMarkdownBody(page.body)
    .replace(/(<a[^>]*href=")\/[^"/]+\/([^"/]+)\/?"/g, '$1#song-$2"')
    // Root-relative images (localized resource images) must survive in the
    // downloaded standalone export document — make them absolute.
    .replace(/(<img[^>]*src=")\//g, `$1${SITE.ORIGIN}`);

  let html = `<section class="song page" id="song-${slug}" data-translated="1">\n`;
  // Hide `meta.title`, as its in body.
  html += `<h2>${NAV_SPAN}</h2>\n`;
  html += `<div class="PageMarkdown">${body}</div>\n`;
  return html + '</section>\n';
}
