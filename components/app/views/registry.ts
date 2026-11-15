import { createElement } from 'react';

import AudioView from '@/components/app/views/AudioView';
import AuthorsView from '@/components/app/views/AuthorsView';
import AZView from '@/components/app/views/AZView';
import BookListView from '@/components/app/views/BookListView';
import ContentsView from '@/components/app/views/ContentsView';
import PageBody from '@/components/content/PageBody';
import SearchView from '@/components/app/views/SearchView';
import SongBody from '@/components/content/SongBody';
import { ANALYTICS_PAGE_TYPE } from '@/other/analytics';
import { getRoutePath } from '@/other/router/routes';
import { ITEM_TYPE } from '@/types/common';

import type { ComponentType, ReactNode } from 'react';
import type { TLayoutChromeProps } from '@/components/common/Layout/LayoutChrome';
import type { TPageData, TPageKind } from '@/types/pageData';
import type { TViewProps } from '@/components/app/views/types';

/**/
const VIEWS: { [K in TPageKind]: ComponentType<TViewProps<K>> } = {
  'book-list': BookListView,
  contents: ContentsView,
  'a-z': AZView,
  authors: AuthorsView,
  search: SearchView,
  audio: AudioView,
  'audio-singer': AudioView,
  song: SongBody,
  page: PageBody
};

/**
 * View of the page's kind, keyed by its path so each page mounts fresh.
 * `createElement` instead of JSX: the component is picked at render time
 * (react-hooks/static-components).
 */
export function renderView(page: TPageData, extras?: ReactNode): ReactNode {
  const View = VIEWS[page.kind] as ComponentType<{ extras?: ReactNode; page: TPageData }>;
  return createElement(View, { extras, key: getRoutePath(page.route), page });
}

/** Layout props (main class, footer page, analytics) of the page's kind. */
export function getChrome(page: TPageData): TLayoutChromeProps {
  const { bookId } = page.route;

  switch (page.kind) {
    case 'book-list':
      return { bookId, pageType: ANALYTICS_PAGE_TYPE.BOOK_LIST };
    case 'audio-singer':
      return { bookId, itemId: page.route.singerId, pageType: ANALYTICS_PAGE_TYPE.AUDIO_SINGER };
    case 'song':
      return {
        bookId,
        className: 'ContentPage',
        itemId: page.route.slug,
        page: page.data.song.meta?.page,
        pageType: ITEM_TYPE.SONG
      };
    case 'page':
      return {
        bookId,
        className: 'ContentPage',
        itemId: page.route.slug,
        page: page.data.page.meta?.page,
        pageType: ITEM_TYPE.PAGE
      };
    default:
      return { bookId, pageType: page.kind };
  }
}
