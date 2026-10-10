import { getBooksMap } from '@/lib/books';
import { getBookDescriptionsByBook } from '@/lib/song';
import { getCommonMeta } from '@/other/metadata/helpers/getCommonMeta';
import { getOG } from '@/other/metadata/helpers/getOG';
import { getSongPageTitle } from '@/other/metadata/helpers/getSongPageTitle';
import { getTwitter } from '@/other/metadata/helpers/getTwitter';
import { KEYWORDS, ROBOTS } from '@/other/metadata/helpers/constants';

import type { Metadata } from 'next';
import type { TMetaCtx } from '@/lib/content/handler';
import type { TBookDescription, TBooksMap } from '@/types/book';
import type { TSong } from '@/types/song';

/**
 * Metadata for a song item. Title/description derive from the song's
 * title/first line; `languages` alternates list every book with this song.
 */
export async function getSongMeta(
  song: TSong,
  { bookId, slug }: TMetaCtx
): Promise<Partial<Metadata>> {
  const description = song.meta?.first_line;
  const title = getSongPageTitle(song);

  const booksMap = await getBooksMap();
  const languages = await getLanguages(slug, booksMap);
  languages['x-default'] = `/${bookId}/${slug}`;

  const authors = song.author?.length > 0
    ? [{ name: song.author[0] }]
    : void 0;

  return {
    ...getCommonMeta(),
    alternates: {
      canonical: `/${bookId}/${slug}`,
      languages: languages
    },
    authors: authors,
    description: description,
    keywords: getKeywords(song, authors),
    openGraph: getOG(bookId, description, title, slug),
    robots: ROBOTS,
    title: title,
    twitter: getTwitter(bookId, description, title)
  } as Metadata;
}

/**
 *
 */
function getKeywords(song: TSong, authors?: Array<{ name: string }>): Array<string> {
  const keywords = KEYWORDS;

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
async function getLanguages(songSlug: string, booksMap: TBooksMap) {
  const languages = {};

  const descriptions = (await getBookDescriptionsByBook(
    songSlug,
    booksMap
  )) as TBookDescription[];

  descriptions.forEach((d: TBookDescription) => {
    const lang = d.slug.slice(0, 2);
    languages[lang] = `/${d.slug}/${songSlug}`;
  });

  return languages;
}
