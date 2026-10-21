import { escHtml as esc } from '@/other/exportDoc';
import { getBooksMap } from '@/lib/books';
import { getContentHandler } from '@/lib/content/registry';
import { getContentsByBookId, getIndexesByBookId } from '@/lib/contents';
import { heading } from '@/lib/content/exportHtml';
import { translate } from '@/other/i18n';

import type { TContentGroup, TContentItem } from '@/types/common';


/**/
export type TExportDoc = {
  body: string;
  lang: string;
  title: string;
};

type TIndexOpts = {
  bookId: string;
  className: string;
  getTitle: (item: TContentItem) => string;
  groups: TContentGroup[];
  headingKey: string;
  showGroupNames: boolean;
};

/**
 * Unified renderer for TOC and A–Z first-lines sections.
 * Each item is a single link containing "title — page".
 * `data-translated` mirrors `item.has.translation` so the client filter
 * can hide untranslated entries via the same query as songs.
 */
function renderIndex(opts: TIndexOpts): string {
  let html = heading(1, translate(opts.bookId, opts.headingKey));

  for (const group of opts.groups) {
    if (opts.showGroupNames && group.name) {
      html += heading(2, group.name, `${opts.className}-group`);
    }

    for (const item of group.items as TContentItem[]) {
      const title = opts.getTitle(item);
      const page = item.page
        ? `<span class="page-num"> — ${esc(String(item.page))}</span>`
        : '';
      const flag = item.has?.translation ? 1 : 0;
      const entryCls = getContentHandler(item.type).indexEntryClass;
      const pageCls = entryCls ? ` ${entryCls}` : '';
      html += `<p class="${opts.className}${pageCls}" data-translated="${flag}"><a href="#song-${item.id}">${esc(
        title
      )}${page}</a></p>\n`;
    }
  }

  return html;
}

/**
 *
 */
function renderFirstLines(indexes: TContentGroup[], bookId: string): string {
  return renderIndex({
    bookId,
    className: 'first-line',
    // In the a-z file, title and aliasName are swapped vs. contents.
    getTitle: (item) => item.title || item.aliasName,
    groups: indexes,
    headingKey: 'FOOTER.INDEX',
    showGroupNames: true
  });
}

/**
 * Builds the whole songbook body as minimal HTML suitable for opening in
 * a word processor. The client wraps it into a standalone document after
 * applying the export options.
 */
export async function buildExportHtml(bookId: string): Promise<TExportDoc> {
  const booksMap = getBooksMap();
  const contents = getContentsByBookId(bookId);
  const indexes = getIndexesByBookId(bookId);
  const book = booksMap[bookId];
  const bookTitle = book?.title || bookId;

  let body = heading(1, bookTitle, 'book-title');
  body +=
    `<p class="nav-links"><a href="#first-lines">↓ ${esc(
      translate(bookId, 'FOOTER.INDEX')
    )}</a></p>\n`;
  body += `<section class="toc" id="toc">\n${renderIndex({
    bookId,
    className: 'toc-item',
    getTitle: (item) => item.title,
    groups: contents,
    headingKey: 'FOOTER.CONTENTS',
    showGroupNames: true
  })}</section>\n`;
  const seen = new Set<string>();

  for (const group of contents) {
    let groupHtml = group.name ? heading(1, group.name) : '';

    for (const item of group.items as TContentItem[]) {
      // Songs with page duplicates appear twice in contents; emit once.
      if (seen.has(item.id)) continue;
      seen.add(item.id);

      const handler = getContentHandler(item.type);
      const data = await handler.load(item.id, bookId);
      if (!data) continue;
      groupHtml += handler.renderExport(data, item.id);
    }

    body += `<section class="category">\n${groupHtml}</section>\n`;
  }

  body += `<section class="first-lines" id="first-lines">\n${renderFirstLines(
    indexes,
    bookId
  )}</section>\n`;

  const lang = bookId.slice(0, 2);

  return { body, lang, title: bookTitle };
}
