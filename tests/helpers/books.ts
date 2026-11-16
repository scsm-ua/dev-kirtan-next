import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { TBooksMap } from '@/types/book';
import type { TContentGroup, TContentItem } from '@/types/common';
import type { TSong } from '@/types/song';

/**
 * Reads the processed songbooks (`source/books/`) straight from disk, so the
 * tests do not depend on the `lib/` code they check.
 */

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const BOOKS_DIR = path.join(ROOT, 'source/books');

/** A contents item as the pipeline writes it. */
export type TItem = TContentItem & { author: string | null };

/** A song file as the pipeline writes it: no fields derived by `lib/song.ts`. */
export type TSongFile = Pick<TSong, 'author' | 'resources' | 'subtitle' | 'title' | 'verses'> & {
  meta: TSong['meta'] & { 'no-author'?: 1 };
};

const cache = new Map<string, unknown>();

/** Parsed JSON file. The result is shared between callers: do not change it. */
export function readJson<T>(...pathParts: string[]): T {
  const file = path.join(...pathParts);
  if (!cache.has(file)) cache.set(file, JSON.parse(readFileSync(file, 'utf8')));

  return cache.get(file) as T;
}

/**/
export function getBooksMap(): TBooksMap {
  return readJson(BOOKS_DIR, 'songbooks.json');
}

/**/
export function getBookIds(): string[] {
  return Object.keys(getBooksMap());
}

/** A file of one book, e.g. `a-z.json`. */
export function readBookFile<T>(bookId: string, file: string): T {
  return readJson(BOOKS_DIR, bookId, file);
}

/** Every contents item in order; a song listed twice is here twice. */
export function getItems(bookId: string): TItem[] {
  return readBookFile<TContentGroup[]>(bookId, 'contents.json').flatMap(
    (group) => group.items as TItem[]
  );
}

/** Songs of a book, each one once. */
export function getSongItems(bookId: string): TItem[] {
  const seen = new Set<string>();

  return getItems(bookId).filter((item) => {
    if (item.type !== 'song' || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**/
export function readSong(bookId: string, slug: string): TSongFile {
  return readJson(BOOKS_DIR, bookId, 'songs', `${slug}.json`);
}
