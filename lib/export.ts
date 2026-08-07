import { escHtml as esc } from '@/other/exportDoc';
import { getBooksMap } from '@/lib/books';
import { getContentsByBookId, getIndexesByBookId } from '@/lib/contents';
import { getSongBySlug } from '@/lib/song';
import { translate } from '@/other/i18n';
import { processTranslationLines } from '@/other/utils';

import type { TContentGroup, TContentItem } from '@/types/common';
import type { TSong, TVerse } from '@/types/song';


/**/
export type TExportDoc = {
  body: string;
  lang: string;
  title: string;
};

/**
 * Songs explicitly marked as untranslatable (transliteration only).
 */
function isTranslated(song: TSong): boolean {
  return song.meta?.translation !== 'no';
}

/**
 * Escape + encode spaces so Word's HTML importer preserves verse alignment.
 * Leading indent and runs of 2+ spaces become &nbsp; chains.
 */
function escVerseSpaces(line: string): string {
  return line
    .replace(/^ +/, (m) => '&nbsp;'.repeat(m.length))
    .replace(/ {2,}/g, (m) => '&nbsp;'.repeat(m.length));
}

/**
 * Mirrors the bold/non-bold logic from VerseText / getLineContent.
 * Bold parts are wrapped in <strong>; paren groups and non-bold lines are plain.
 */
function renderVerseLine(
  line: string,
  meta: TSong['meta'],
  hasNumber: boolean
): string {
  const escaped = escVerseSpaces(esc(line));

  if (meta?.['inline verse'] === 'non bold' && !hasNumber) {
    return escaped;
  }

  if (meta?.['verse parentheses'] === 'non bold') {
    // Split on (...) groups; odd indices are paren content (plain), even are bold.
    const parts = escaped.split(/(\([^)]+\))/g);
    return parts
      .map((part, i) => (i % 2 === 1 || !part ? part : `<strong>${part}</strong>`))
      .join('');
  }

  return `<strong>${escaped}</strong>`;
}

/**
 * One paragraph per block; source lines are joined with <br> so the block
 * stays a single restylable paragraph in a word processor.
 */
function paragraph(cls: string, lines: string[], isHtml = false): string {
  if (!lines || lines.length === 0) return '';
  const content = (isHtml ? lines : lines.map(esc)).join('<br>\n');
  return `<p class="${cls}">${content}</p>\n`;
}

/**
 *
 */
function heading(level: number, text: string, cls?: string): string {
  if (!text) return '';
  const attr = cls ? ` class="${cls}"` : '';
  return `<h${level}${attr}>${esc(text)}</h${level}>\n`;
}

/**
 *
 */
function renderVerse(
  verse: TVerse,
  showNumber: boolean,
  meta: TSong['meta'],
  headerPrefix = ''
): string {
  const num = showNumber && verse.number ? esc(verse.number) : '';
  const hasNumber = !!verse.number;
  let html = `<div class="verse-block" data-number="${num}">\n`;

  html += headerPrefix;
  if (num) {
    html += heading(5, verse.number);
  }
  if (verse.subtitle?.length > 0) {
    verse.subtitle.forEach((s) => (html += heading(3, s)));
  }
  html += paragraph('verse', verse.text?.map((l) => renderVerseLine(l, meta, hasNumber)), true);
  html += paragraph(
    'wbw',
    processTranslationLines(verse.word_by_word, 'wbw'),
    true
  );
  html += paragraph(
    'translation',
    processTranslationLines(verse.translation, 'translation'),
    true
  );

  return html + '</div>\n';
}

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
      html += `<p class="${opts.className}" data-translated="${flag}"><a href="#song-${item.id}">${esc(
        title
      )}${page}</a></p>\n`;
    }
  }

  return html;
}

/**
 *
 */
function renderSong(song: TSong, slug: string): string {
  let html = `<section class="song" id="song-${slug}" data-translated="${
    isTranslated(song) ? 1 : 0
  }">\n`;

  const navSpan =
    ' <span class="nav-links">&nbsp;&nbsp;<a href="#toc">↑</a>&nbsp;&nbsp;<a href="#first-lines">↓</a></span>';
  const songTitle = esc((song.title || []).join(' '));
  // Song headings go inside the first verse-block so break-inside: avoid keeps them together.
  let songHeader = `<h2>${songTitle}${navSpan}</h2>\n`;
  (song.subtitle || []).forEach((s: string) => (songHeader += heading(3, s)));
  (song.author || []).forEach((a: string) => (songHeader += heading(4, a)));
  songHeader += paragraph('wbw', processTranslationLines(song.word_by_word, 'wbw'), true);

  const showNumbers = song.verses.length > 1;
  song.verses.forEach((verse, i) => {
    html += renderVerse(verse, showNumbers, song.meta, i === 0 ? songHeader : '');
  });

  return html + '</section>\n';
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
  const [booksMap, contents, indexes] = await Promise.all([
    getBooksMap(),
    getContentsByBookId(bookId),
    getIndexesByBookId(bookId)
  ]);
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

      const song = await getSongBySlug(item.id, bookId);
      if (!song) continue;
      groupHtml += renderSong(song, item.id);
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
