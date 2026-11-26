import {
  getBookIds,
  getBooksMap,
  getItems,
  getSongItems,
  readSong
} from '@/tests/helpers/books';

import { DEFAULT_LANGUAGE } from '@/other/i18n';
import { ABOUT_PAGE_SLUG } from '@/other/paths';

import type { TBookDescription } from '@/types/book';
import type { TItem, TSongFile } from '@/tests/helpers/books';

/**
 * Finders: pick a real song or book by feature instead of naming it
 * (.github/plans/2026-11-16_plan-tests.md, rules R1 and R2). A finder throws when no
 * real song covers its case, so coverage is never lost silently.
 */

type TCandidate = {
  bookId: string;
  item: TItem;
  song: TSongFile;
  // How many times the song is listed in the contents of its book.
  occurrences: number;
  // How many books have a song with this slug.
  bookCount: number;
};

const SONG_CASES = {
  'meta-author': ({ song }) => !!song.meta.author,
  'author-line-only': ({ song }) =>
    !song.meta.author && !!song.author?.[0] && song.meta['no-author'] !== 1,
  'no-author': ({ song }) => song.meta['no-author'] === 1,
  'listed-twice-with-several-pages': ({ item, occurrences }) =>
    occurrences > 1 && item.pages.length > 1,
  // Its listings are one block repeat: only repeated songs stand between them.
  'listed-twice-with-same-page': ({ bookId, item }) => {
    const all = getItems(bookId);
    const places = all.flatMap((other, i) => (other.id === item.id ? [i] : []));
    const count = (id: string) => all.filter((other) => other.id === id).length;

    return (
      places.length > 1 &&
      places[0] > 0 &&
      places.every((i) => all[i].page === item.page) &&
      all.slice(places[0] + 1, places[places.length - 1]).every((other) => count(other.id) > 1)
    );
  },
  'alt-first-lines': ({ item }) => !!item.altAliasNames?.length,
  'no-translation': ({ item }) => !item.has.translation,
  'no-audio': ({ song }) => !song.resources?.audio?.length,
  'several-singers': ({ song }) => song.resources?.audio?.length > 1,
  image: ({ song }) => !!song.resources?.image,
  'word-by-word': ({ song }) => song.verses.some((verse) => verse.word_by_word?.length > 0),
  'in-several-books': ({ bookCount }) => bookCount > 1,
  'in-one-book': ({ bookCount }) => bookCount === 1
} satisfies Record<string, (candidate: TCandidate) => boolean>;

/** The book lists a markdown page with the About slug in its contents. */
export const hasOwnAbout = (bookId: string) =>
  getItems(bookId).some((item) => item.id === ABOUT_PAGE_SLUG && item.type === 'page');

/** The book whose About page the header of a book opens: its own, else the default-language one, else `null`. */
export const getAboutBookId = (bookId: string) =>
  [bookId, DEFAULT_LANGUAGE].find(hasOwnAbout) ?? null;

const BOOK_CASES = {
  'audio-filter': (book) => !!book.audio?.filter?.by_title?.length,
  'markdown-pages': (book) => getItems(book.slug).some((item) => item.type === 'page'),
  hidden: (book) => !!book.hidden
} satisfies Record<string, (book: TBookDescription) => boolean>;

export type TSongCase = keyof typeof SONG_CASES;
export type TBookCase = keyof typeof BOOK_CASES;

export const SONG_CASE_NAMES = Object.keys(SONG_CASES) as TSongCase[];

let candidates: TCandidate[] | undefined;

/**/
function getCandidates(): TCandidate[] {
  if (candidates) return candidates;

  const bookCounts = new Map<string, number>();
  getBookIds()
    .flatMap((bookId) => getSongItems(bookId))
    .forEach(({ id }) => bookCounts.set(id, (bookCounts.get(id) ?? 0) + 1));

  candidates = getBookIds().flatMap((bookId) => {
    const all = getItems(bookId);

    return getSongItems(bookId).map((item) => ({
      bookId,
      item,
      song: readSong(bookId, item.id),
      occurrences: all.filter((other) => other.id === item.id).length,
      bookCount: bookCounts.get(item.id)
    }));
  });

  return candidates;
}

/** First real song that covers the case. */
export function findSong(name: TSongCase): { bookId: string; slug: string } {
  const found = getCandidates().find(SONG_CASES[name]);

  if (!found) {
    throw new Error(
      `No real song covers the case "${name}". Use an inline input for it or drop the case.`
    );
  }

  return { bookId: found.bookId, slug: found.item.id };
}

/** Id of the first real book that covers the case. */
export function findBook(name: TBookCase): string {
  const found = Object.values(getBooksMap()).find(BOOK_CASES[name]);

  if (!found) {
    throw new Error(
      `No real book covers the case "${name}". Use an inline input for it or drop the case.`
    );
  }

  return found.slug;
}
