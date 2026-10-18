import fs from 'node:fs/promises';
import path from 'path';

import { FILES, PATH } from '@/other/constants';
import type { TContentGroup, TContentItem } from '@/types/common';

/**/
export function getAuthorsByBookId(bookId: string): Promise<Array<TContentGroup>> {
  return getListDataByBookId(bookId, FILES.AUTHORS);
}

/**
 * Finds a content item by slug across all groups, or `null` if absent.
 * Used to resolve an item's `type` before loading its body.
 */
export async function getContentItemBySlug(
  bookId: string,
  slug: string
): Promise<TContentItem | null> {
  const groups = await getContentsByBookId(bookId);
  for (const group of groups) {
    const item = group.items.find((i: TContentItem) => i.id === slug);
    if (item) return item;
  }
  return null;
}

/**/
export function getContentsByBookId(bookId: string): Promise<Array<TContentGroup>> {
  return getListDataByBookId(bookId, FILES.CONTENTS);
}

/**/
export function getIndexesByBookId(bookId: string): Promise<Array<TContentGroup>> {
  return getListDataByBookId(bookId, FILES.A_Z);
}

/**
 * Per-build memo: skips repeated JSON.parse of the same index files across
 * the ~1200 prerendered pages. Disabled in dev so source edits show up
 * without a server restart.
 */
const cache = new Map<string, Promise<Array<TContentGroup>>>();

/**
 *
 */
function getListDataByBookId(
  bookId: string,
  fileName: string
): Promise<Array<TContentGroup>> {
  const p = path.join(process.cwd(), PATH.DIR.SOURCE_BOOKS, bookId, fileName);

  if (process.env.NODE_ENV !== 'production') return readListData(p);

  let data = cache.get(p);
  if (!data) {
    data = readListData(p);
    cache.set(p, data);
  }
  return data;
}

/**
 *
 */
async function readListData(p: string): Promise<Array<TContentGroup>> {
  const str = await fs.readFile(p, 'utf8');
  return JSON.parse(str);
}
