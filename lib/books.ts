import fs from 'node:fs';
import path from 'path';

import { FILES, PATH } from '@/other/constants';
import type { TBookDescription, TBooksMap } from '@/types/book';

let booksMap: TBooksMap | undefined;

/**
 * Reads the songbooks map once and reuses it (the file is static per build).
 */
export function getBooksMap(): TBooksMap {
  if (!booksMap) {
    const p = path.join(process.cwd(), PATH.DIR.SOURCE_BOOKS, FILES.SONGBOOKS);
    booksMap = JSON.parse(fs.readFileSync(p, 'utf8'));
  }

  return booksMap;
}

/**
 *
 */
export function getBookIdParamList(): Array<{ bookId: string }> {
  return Object.keys(getBooksMap())
    .map((bookId: string) => ({ bookId }));
}

/**
 *
 */
export function getBookIdList(): Array<string> {
  return Object.keys(getBooksMap());
}

/**
 *
 */
export function getBookDescriptionById(id: string): TBookDescription {
  return getBooksMap()[id];
}
