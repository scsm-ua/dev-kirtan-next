import { createElement } from 'react';

import AudioView from '@/components/app/views/AudioView';
import AuthorsView from '@/components/app/views/AuthorsView';
import AZView from '@/components/app/views/AZView';
import BookListView from '@/components/app/views/BookListView';
import ContentsView from '@/components/app/views/ContentsView';
import OtherBooksView from '@/components/app/views/OtherBooksView';
import PageBody from '@/components/content/PageBody';
import SearchView from '@/components/app/views/SearchView';
import SongBody from '@/components/content/SongBody';
import { getRoutePath, ROUTE_KIND } from '@/other/router/routes';
import { ITEM_TYPE } from '@/types/common';

import type { ComponentType, ReactNode } from 'react';
import type { TLayoutChromeProps } from '@/components/common/Layout/LayoutChrome';
import type { TPageData, TPageDataOf, TPageKind } from '@/types/pageData';
import type { TNavItemsMap } from '@/types/song';
import type { TViewProps } from '@/components/app/views/types';

/** Client side of one page kind: its view and the rules the app root applies to it. */
type TViewEntry<K extends TPageKind> = {
  View: ComponentType<TViewProps<K>>;
  /** Layout props (main class, header About link, footer page, analytics); default `{ bookId, pageType: kind }`. */
  chrome?(page: TPageDataOf<K>): TLayoutChromeProps;
  /** `false`: opening the page starts no book caching. Default `true`. */
  precache?: boolean;
  /** Paths to prefetch after the page is shown. */
  prefetch?(page: TPageDataOf<K>): Array<string>;
};

/** Neighbouring items are the likeliest next pages. */
function getNavPaths(nav: TNavItemsMap): Array<string> {
  return Object.values(nav).flatMap(({ prev, next }) =>
    [prev, next].flatMap((item) => (item ? [item.path] : []))
  );
}

/** One entry per page kind (route kinds, with `item` split into the item types); a missing kind is a type error. */
const VIEWS: { [K in TPageKind]: TViewEntry<K> } = {
  [ROUTE_KIND.BOOK_LIST]: {
    View: BookListView,
    chrome: ({ data, route }) => ({
      about: data.about,
      bookId: route.bookId,
      hideCacheStatus: true,
      pageType: ROUTE_KIND.BOOK_LIST
    }),
    // The songbook list is not a page of one book.
    precache: false
  },
  [ROUTE_KIND.OTHER]: { View: OtherBooksView },
  [ROUTE_KIND.CONTENTS]: { View: ContentsView },
  [ROUTE_KIND.A_Z]: { View: AZView },
  [ROUTE_KIND.AUTHORS]: { View: AuthorsView },
  [ROUTE_KIND.SEARCH]: { View: SearchView },
  [ROUTE_KIND.AUDIO]: { View: AudioView },
  [ROUTE_KIND.AUDIO_SINGER]: {
    View: AudioView,
    chrome: ({ route }) => ({
      bookId: route.bookId,
      itemId: route.singerId,
      pageType: ROUTE_KIND.AUDIO_SINGER
    })
  },
  [ITEM_TYPE.SONG]: {
    View: SongBody,
    chrome: ({ data, route }) => ({
      bookId: route.bookId,
      className: 'ContentPage',
      itemId: route.slug,
      page: data.song.meta?.page,
      pageType: ITEM_TYPE.SONG
    }),
    prefetch: ({ data }) => getNavPaths(data.nav)
  },
  [ITEM_TYPE.PAGE]: {
    View: PageBody,
    chrome: ({ data, route }) => ({
      bookId: route.bookId,
      className: 'ContentPage',
      itemId: route.slug,
      page: data.page.meta?.page,
      pageType: ITEM_TYPE.PAGE
    }),
    prefetch: ({ data }) => getNavPaths(data.nav)
  }
};

/** Entry of the page's kind. The table ties each entry to its own kind; this lookup cannot show that to TypeScript. */
function getEntry(page: TPageData): TViewEntry<TPageKind> {
  return VIEWS[page.kind] as unknown as TViewEntry<TPageKind>;
}

/**
 * View of the page's kind, keyed by its path so each page mounts fresh.
 * `createElement` instead of JSX: the component is picked at render time
 * (react-hooks/static-components).
 */
export function renderView(page: TPageData, extras?: ReactNode): ReactNode {
  return createElement(getEntry(page).View, { extras, key: getRoutePath(page.route), page });
}

/** Layout props (main class, header About link, footer page, analytics) of the page's kind. */
export function getChrome(page: TPageData): TLayoutChromeProps {
  return getEntry(page).chrome?.(page) ?? { bookId: page.route.bookId, pageType: page.kind };
}

/** Whether opening the page starts caching its book for offline use. */
export function isPrecachePage(page: TPageData): boolean {
  return getEntry(page).precache ?? true;
}

/** Paths to prefetch after the page is shown. */
export function getPrefetchPaths(page: TPageData): Array<string> {
  return getEntry(page).prefetch?.(page) ?? [];
}
