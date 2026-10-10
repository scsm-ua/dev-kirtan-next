import { escHtml as esc } from '@/other/exportDoc';
import { heading, NAV_SPAN } from '@/lib/content/exportHtml';
import { processTranslationLines } from '@/other/utils';
import { SITE } from '@/other/constants';

import type { TSong, TVerse } from '@/types/song';

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

/**
 * Song image (mirrors SongImage in the app view). Root-relative src is made
 * absolute so the downloaded standalone document still resolves it.
 */
function renderImage(song: TSong): string {
  const image = song.resources?.image;
  if (!image) return '';

  const src = image.src.startsWith('/')
    ? SITE.ORIGIN + image.src.slice(1)
    : image.src;
  const alt = esc((song.title || []).join(' '));
  return `<p class="song-image"><img src="${src}" alt="${alt}" width="${image.width}" height="${image.height}"></p>\n`;
}

/**
 * Song section for the songbook HTML export.
 */
export function renderSong(song: TSong, slug: string): string {
  let html = `<section class="song" id="song-${slug}" data-translated="${
    isTranslated(song) ? 1 : 0
  }">\n`;

  const navSpan = NAV_SPAN;
  const songTitle = esc((song.title || []).join(' '));
  // Song headings go inside the first verse-block so break-inside: avoid keeps them together.
  let songHeader = renderImage(song);
  songHeader += `<h2>${songTitle}${navSpan}</h2>\n`;
  (song.subtitle || []).forEach((s: string) => (songHeader += heading(3, s)));
  (song.author || []).forEach((a: string) => (songHeader += heading(4, a)));
  songHeader += paragraph('wbw', processTranslationLines(song.word_by_word, 'wbw'), true);

  const showNumbers = song.verses.length > 1;
  song.verses.forEach((verse, i) => {
    html += renderVerse(verse, showNumbers, song.meta, i === 0 ? songHeader : '');
  });

  return html + '</section>\n';
}
