import fs from 'node:fs';
import path from 'path';

import { FILES, PATH } from '@/other/constants';
import type { TContentGroup, TContentItem } from '@/types/common';

/**/
export function getAuthorsByBookId(bookId: string): Array<TContentGroup> {
  return getListDataByBookId(bookId, FILES.AUTHORS);
}

/**
 * Finds a content item by slug across all groups, or `null` if absent.
 * Used to resolve an item's `type` before loading its body.
 */
export function getContentItemBySlug(
  bookId: string,
  slug: string
): TContentItem | null {
  const groups = getContentsByBookId(bookId);
  for (const group of groups) {
    const item = group.items.find((i: TContentItem) => i.id === slug);
    if (item) return item;
  }
  return null;
}

/**/
export function getContentsByBookId(bookId: string): Array<TContentGroup> {
  return getListDataByBookId(bookId, FILES.CONTENTS);
}

/**/
export function getIndexesByBookId(bookId: string): Array<TContentGroup> {
  return getListDataByBookId(bookId, FILES.A_Z);
}

/**
 *
 */
function getListDataByBookId(
  bookId: string,
  fileName: string
): Array<TContentGroup> {
  const p = path.join(process.cwd(), PATH.DIR.SOURCE_BOOKS, bookId, fileName);
  return readListData(p);
}

/**
 * Per-build memo: skips repeated JSON.parse of the same index files across
 * the ~1200 prerendered pages. Disabled in dev so source edits show up
 * without a server restart.
 */
const cache = new Map<string, Array<TContentGroup>>();

/**
 *
 */
function readListData(p: string): Array<TContentGroup> {
  if (process.env.NODE_ENV !== 'production') {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }

  let data = cache.get(p);
  if (!data) {
    data = JSON.parse(fs.readFileSync(p, 'utf8'));
    cache.set(p, data);
  }
  return data;
}
