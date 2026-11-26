import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getBookDescriptionsByBook,
  getNavItems,
  getSongBySlug,
  getTelegraphUrl
} from '@/lib/song';
import { getSongPathWithPage } from '@/other/paths';
import {
  getBookIds,
  getBooksMap,
  getItems,
  getSongItems,
  readJson,
  readSong,
  ROOT
} from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';

import type { TItem } from '@/tests/helpers/books';
import type { TNavItem } from '@/types/song';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getSongBySlug', () => {
  it('keeps what the song file has', async () => {
    const { bookId, slug } = findSong('meta-author');
    const { meta, title, verses } = readSong(bookId, slug);
    const song = await getSongBySlug(slug, bookId);

    expect(song).toMatchObject({ meta, title });
    expect(song.verses.map((verse) => verse.text)).toEqual(verses.map((verse) => verse.text));
  });

  it('prepares the inline word-by-word rows of a song that has word-by-word', async () => {
    const { bookId, slug } = findSong('word-by-word');
    const song = await getSongBySlug(slug, bookId);
    const verse = song.verses.find((candidate) => candidate.word_by_word?.length > 0);

    expect(song.hasWbw).toBe(true);
    expect(verse.inline_word_by_word).toHaveLength(verse.text.length);
    expect(typeof verse.isWbwInlineModeAvailable).toBe('boolean');
  });

  it('reports a missing song and returns null', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const [bookId] = getBookIds();

    expect(await getSongBySlug('no-such-song', bookId)).toBeNull();
    expect(error).toHaveBeenCalledOnce();
  });
});

describe.each(getBookIds())('songs of %s', (bookId) => {
  it('get their flags from their verses', async () => {
    const problems: string[] = [];

    for (const { id } of getSongItems(bookId)) {
      const raw = readSong(bookId, id);
      const song = await getSongBySlug(id, bookId);
      const has = (key: 'text' | 'translation' | 'word_by_word') =>
        raw.verses.some((verse) => verse[key]?.length > 0);
      const wbwVerses = song?.verses.filter((verse) => verse.word_by_word?.length > 0) ?? [];
      const styles = raw.meta.styles?.verses;

      const problem =
        (!song && 'not loaded') ||
        (song.hasWbw !== has('word_by_word') && 'hasWbw') ||
        (song.hasVersesText !== has('text') && 'hasVersesText') ||
        (song.hasVersesTranslations !== has('translation') && 'hasVersesTranslations') ||
        (wbwVerses.some((verse) => verse.inline_word_by_word?.length !== verse.text.length) &&
          'inline word-by-word rows') ||
        (song.fullInlineWbw !==
          (song.hasWbw && wbwVerses.every((verse) => verse.isWbwInlineModeAvailable)) &&
          'fullInlineWbw') ||
        (!song.hasWbw && song.verses.some((verse) => 'inline_word_by_word' in verse) &&
          'inline rows without word-by-word') ||
        (song.verses.some((verse) => typeof verse.isLong !== 'boolean') && 'isLong') ||
        (song.hasLongVerses && !song.verses.some((verse) => verse.isLong) && 'hasLongVerses') ||
        (styles?.wide === false && song.hasLongVerses && 'long verses in a song that turns them off') ||
        (styles?.align === 'left' && !song.verses.every((verse) => verse.isLong) && 'left-aligned verses');

      if (problem) problems.push(`${bookId}/${id}: ${problem}`);
    }

    expect(problems).toEqual([]);
  });
});

describe.each(getBookIds())('getNavItems in %s', (bookId) => {
  const all = getItems(bookId);
  const samePlace = (a: TItem, b: TItem) => a.id === b.id && String(a.page) === String(b.page);

  // Navigation skips a listing that is repeated later with the same page.
  const items = all.filter((item, i) => !all.slice(i + 1).some((later) => samePlace(item, later)));

  const isLinkTo = (link: TNavItem | void, item: TItem | undefined) =>
    item
      ? !!link && link.title === item.title && link.path === getSongPathWithPage(bookId, item)
      : !link;

  it('links every item to its neighbours in the contents, per page of the item', async () => {
    const problems: string[] = [];

    for (const slug of new Set(items.map((item) => item.id))) {
      const nav = await getNavItems(slug, bookId);
      const places = items.flatMap((item, i) => (item.id === slug ? [i] : []));
      const pages = places.map((i) => items[i].page).filter(Boolean).map(String);
      const keys = pages.length ? pages : ['_'];

      if (Object.keys(nav).sort().join() !== [...keys].sort().join()) {
        problems.push(`${bookId}/${slug}: pages ${Object.keys(nav)} instead of ${keys}`);
        continue;
      }

      for (const [page, { prev, next }] of Object.entries(nav)) {
        const isPlace = places.some(
          (i) =>
            (page === '_' || String(items[i].page) === page) &&
            isLinkTo(prev, items[i - 1]) &&
            isLinkTo(next, items[i + 1])
        );

        if (!isPlace) problems.push(`${bookId}/${slug}: wrong neighbours for page ${page}`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('walks the same items forward with next and back with prev', async () => {
    const navOf = async (item: TItem) => {
      const nav = await getNavItems(item.id, bookId);
      return nav[String(item.page)] ?? nav._;
    };
    const itemOf = (link: TNavItem | void) =>
      link && items.find((item) => getSongPathWithPage(bookId, item) === link.path);

    const walk = async (from: TItem, dir: 'prev' | 'next') => {
      const paths: string[] = [];

      for (let item = from; item && paths.length <= items.length; ) {
        paths.push(getSongPathWithPage(bookId, item));
        item = itemOf((await navOf(item))[dir]);
      }

      return paths;
    };

    const forward = await walk(items[0], 'next');
    const back = await walk(items[items.length - 1], 'prev');

    expect(forward).toEqual(items.map((item) => getSongPathWithPage(bookId, item)));
    expect(back).toEqual([...forward].reverse());
  });

  it('gives the first item no previous one and the last item no next one', async () => {
    const first = await getNavItems(items[0].id, bookId);
    const last = await getNavItems(items[items.length - 1].id, bookId);

    expect(Object.values(first).some(({ prev }) => !prev)).toBe(true);
    expect(Object.values(last).some(({ next }) => !next)).toBe(true);
  });
});

describe('getNavItems of a song listed twice with the same page', () => {
  it('has one entry: back leaves the first listing, forward leaves the last one', async () => {
    const { bookId, slug } = findSong('listed-twice-with-same-page');
    const all = getItems(bookId);
    const places = all.flatMap((item, i) => (item.id === slug ? [i] : []));
    const between = all.slice(places[0] + 1, places[places.length - 1]);
    const listedOnce = (item: TItem) => all.filter((other) => other.id === item.id).length === 1;

    const nav = await getNavItems(slug, bookId);
    const [{ prev, next }] = Object.values(nav);

    expect(Object.keys(nav)).toEqual([String(all[places[0]].page)]);
    expect(next && next.path).toBe(
      getSongPathWithPage(bookId, all[places[places.length - 1] + 1])
    );
    // Songs between the listings are repeats too; back never lands on the last of them.
    expect(between.every((item) => !listedOnce(item))).toBe(true);
    expect(prev && prev.path).toBe(getSongPathWithPage(bookId, all[places[0] - 1]));
  });
});

describe('getBookDescriptionsByBook', () => {
  const booksMap = getBooksMap();

  it.each(['in-several-books', 'in-one-book'] as const)(
    'returns the books that have the song, in the site order: %s',
    (name) => {
      const { slug } = findSong(name);
      const expected = getBookIds()
        .filter((bookId) => getItems(bookId).some((item) => item.id === slug))
        .sort((a, b) => (booksMap[a].sort_order ?? Infinity) - (booksMap[b].sort_order ?? Infinity));

      const result = getBookDescriptionsByBook(slug, booksMap).map((book) => book.slug);

      expect(result).toEqual(expected);
      expect(result.length > 1).toBe(name === 'in-several-books');
    }
  );
});

describe('getTelegraphUrl', () => {
  type TTelegraphPage = { author_url: string; url: string };
  const LEGACY_URL = /^https:\/\/kirtan\.site\/([^/]+)\/([^/]+)\.html$/;

  it('finds the Telegraph page of a song by its legacy URL', async () => {
    const pages = readJson<TTelegraphPage[]>(ROOT, 'source/telegraph-pages.json');
    const page = pages.find(({ author_url }) => LEGACY_URL.test(author_url));
    const [, bookId, slug] = LEGACY_URL.exec(page.author_url);

    expect(await getTelegraphUrl(bookId, slug)).toBe(
      // The last entry wins when several pages have the same legacy URL.
      pages.findLast(({ author_url }) => author_url === page.author_url).url
    );
  });

  it('returns null for a song without a Telegraph page', async () => {
    expect(await getTelegraphUrl('en', 'no-such-song')).toBeNull();
  });
});
