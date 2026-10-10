import fs from 'node:fs/promises';
import path from 'path';

import { PATH } from '@/other/constants';

import type { TPage } from '@/types/page';

/**
 * Loads a markdown page by slug. Mirrors `getSongBySlug`: reads the JSON from
 * the book's `pages/` dir and returns `null` when missing/unparsable.
 */
export async function getPageBySlug(
  slug: string,
  bookId: string
): Promise<TPage | null> {
  const p = path.join(
    process.cwd(),
    PATH.DIR.SOURCE_BOOKS,
    bookId,
    PATH.DIR.PAGES,
    slug + '.json'
  );

  try {
    const str = await fs.readFile(p, 'utf8');
    return JSON.parse(str) as TPage;
  } catch (e) {
    console.error(e);
    return null;
  }
}
