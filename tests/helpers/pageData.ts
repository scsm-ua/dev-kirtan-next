import { loadPageData } from '@/lib/pageData';
import { getBookIds, getSongItems } from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';

import type { TPageDataOf, TPageKind, TRoute } from '@/types/pageData';
import type { TSong } from '@/types/song';
import type { TSongCase } from '@/tests/helpers/cases';

/**
 * Real page data for tests: never hand-written, always from `loadPageData`
 * (.github/plans/plan-tests.md, "Page data is never hand-written").
 */

/** Page data of a route; throws when the route gives another kind or nothing. */
export async function loadPage<K extends TPageKind>(route: TRoute, kind: K): Promise<TPageDataOf<K>> {
  const page = await loadPageData(route);

  if (page?.kind !== kind) {
    throw new Error(
      `Expected a "${kind}" page for ${JSON.stringify(route)}, got ${page ? `"${page.kind}"` : 'nothing'}.`
    );
  }

  return page as TPageDataOf<K>;
}

/** Page data of the first real song that covers the case. */
export function loadSongPage(name: TSongCase): Promise<TPageDataOf<'song'>> {
  return loadPage({ kind: 'item', ...findSong(name) }, 'song');
}

/**
 * Page data of the first real song whose *derived* data matches (flags such
 * as `hasWbw` exist only in page data, so the finders in `cases.ts` cannot
 * see them). Throws when no real song matches, so a case is never lost silently.
 */
export async function findSongPage(
  description: string,
  matches: (song: TSong) => boolean
): Promise<TPageDataOf<'song'>> {
  for (const bookId of getBookIds()) {
    for (const { id } of getSongItems(bookId)) {
      const page = await loadPageData({ kind: 'item', bookId, slug: id });
      if (page?.kind === 'song' && matches(page.data.song)) return page;
    }
  }

  throw new Error(`No real song matches "${description}". Use an inline input for it or drop the case.`);
}
