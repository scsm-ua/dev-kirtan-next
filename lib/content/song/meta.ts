import { getBooksMap } from '@/lib/books';
import { getBookDescriptionsByBook } from '@/lib/song';
import { getBookLocale } from '@/other/helpers';
import { getCommonMeta } from '@/other/metadata/helpers/getCommonMeta';
import { getOG } from '@/other/metadata/helpers/getOG';
import { getPageTitle } from '@/other/metadata/helpers/getPageTitle';
import { getSongPageTitle } from '@/other/metadata/helpers/getSongPageTitle';
import { getSongPath } from '@/other/paths';
import { getTwitter } from '@/other/metadata/helpers/getTwitter';
import { KEYWORDS, ROBOTS } from '@/other/metadata/helpers/constants';
import { translate } from '@/other/i18n';

import type { Metadata } from 'next';
import type { TMetaCtx } from '@/lib/content/handler';
import type { TBookDescription, TBooksMap } from '@/types/book';
import type { TSong } from '@/types/song';

// Google truncates SERP titles around this length.
const MAX_TITLE_LENGTH = 60;

// Skip prepending the first line once the composed description reaches this
// length, so the natural-language sentence is not truncated in SERPs.
const MAX_COMPOSED_LENGTH = 120;

/**
 * Metadata for a song item. Title/description derive from the song's
 * title/first line; `languages` alternates list every book with this song.
 */
export async function getSongMeta(
  song: TSong,
  { bookId, slug }: TMetaCtx
): Promise<Partial<Metadata>> {
  const title = getSongPageTitle(song);

  const booksMap = getBooksMap();
  const description = getDescription(song, bookId, booksMap[bookId]?.title ?? '');
  const languages = await getLanguages(slug, booksMap);
  languages['x-default'] = getSongPath(bookId, slug);

  const authors = song.author?.length > 0
    ? [{ name: song.author[0] }]
    : void 0;

  return {
    ...getCommonMeta(),
    alternates: {
      canonical: getSongPath(bookId, slug),
      languages: languages
    },
    authors: authors,
    description: description,
    keywords: getKeywords(song, authors),
    openGraph: getOG(bookId, description, title, getSongPath(bookId, slug), 'music.song'),
    robots: ROBOTS,
    title: getTitleTag(song),
    twitter: getTwitter(bookId, description, title)
  } as Metadata;
}

/**
 * Full title (with author + subtitle) when it fits the SERP length budget,
 * otherwise drops the longer of author / subtitle and keeps the shorter one.
 */
function getTitleTag(song: TSong): string {
  const full = getPageTitle(getSongPageTitle(song));

  if (full.length <= MAX_TITLE_LENGTH) {
    return full;
  }

  const author = song.author?.[0] ?? '';
  const subtitle = song.subtitle?.join(' ') ?? '';
  const keepSubtitle = !!subtitle && (!author || subtitle.length < author.length);

  return getPageTitle(getSongPageTitle(song, keepSubtitle, !keepSubtitle));
}

/**
 * Localized description template; the song's first line (when present) is
 * prepended to keep its keyword value for lyrics searches.
 */
export function getDescription(song: TSong, bookId: string, bookTitle: string): string {
  const author = song.meta?.author || song.author?.[0] || '';

  const key = author
    ? 'SONG_PAGE.META_DESCRIPTION'
    : 'SONG_PAGE.META_DESCRIPTION_NO_AUTHOR';

  const composed = translate(bookId, key)
    .replace('{title}', song.title.join(' '))
    .replace('{author}', author)
    .replace('{book}', bookTitle);

  const firstLine = song.meta?.first_line;
  return firstLine && composed.length <= MAX_COMPOSED_LENGTH
    ? `${firstLine}. ${composed}`
    : composed;
}

/**
 *
 */
function getKeywords(song: TSong, authors?: Array<{ name: string }>): Array<string> {
  const keywords = [...KEYWORDS];

  if (authors?.length > 0) {
    keywords.push(authors[0].name);
  }

  if (song.title?.length > 0) {
    keywords.push(song.title[0]);
  }

  return keywords;
}

/**
 *
 */
function getLanguages(songSlug: string, booksMap: TBooksMap) {
  const languages = {};

  const descriptions = getBookDescriptionsByBook(songSlug, booksMap);

  descriptions.forEach((book: TBookDescription) => {
    languages[getBookLocale(book.slug)] = getSongPath(book.slug, songSlug);
  });

  return languages;
}
