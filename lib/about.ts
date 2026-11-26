import { getBooksMap } from '@/lib/books';
import { getContentItemBySlug } from '@/lib/contents';
import { DEFAULT_LANGUAGE } from '@/other/i18n';
import { ABOUT_PAGE_SLUG, getSongPath } from '@/other/paths';
import { ITEM_TYPE } from '@/types/common';

import type { TAboutLink } from '@/types/pageData';

/**
 * Header link to the About page: the one of the book, else the one of the
 * default-language book, else `null`. The About page is the markdown page
 * item with the reserved slug `about`.
 */
export function getAboutLink(bookId: string): TAboutLink | null {
  for (const id of new Set([bookId, DEFAULT_LANGUAGE])) {
    const item = getBooksMap()[id] && getContentItemBySlug(id, ABOUT_PAGE_SLUG);

    if (item?.type === ITEM_TYPE.PAGE) {
      return { path: getSongPath(id, ABOUT_PAGE_SLUG), title: item.title };
    }
  }

  return null;
}
