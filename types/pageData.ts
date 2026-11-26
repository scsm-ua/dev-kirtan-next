import type { TBookDescription, TBooksMap } from '@/types/book';
import type { TAudioTrack, TSinger } from '@/types/audio';
import type { TContentGroup } from '@/types/common';
import type { TRoute } from '@/other/router/routes';
import type { TPage as TPageContent } from '@/types/page';
import type { TPage as TSearchPage } from '@/types/search';
import type { TNavItemsMap, TSong } from '@/types/song';

/** Derived from the URL table in `other/router/routes.ts`. */
export type { TRoute };

/** Document head values the client applies after a navigation. */
export type THead = {
  canonical: string;  // Site-relative path, e.g. `/en/contents/`.
  description: string;
  title: string;
};

/** Header link to an About page: of the book, or of the default-language book. */
export type TAboutLink = {
  path: string;
  title: string;  // Label of the link, in the language of the page it opens.
};

/** `about` is set on the songbook list only (not on `other`), when there is an About page to open. */
export type TBookListData = {
  about?: TAboutLink;
  booksMap: TBooksMap;
};

/** Contents and a-z share one shape. */
export type TIndexData = {
  book: TBookDescription;
  groups: Array<TContentGroup>;
  hasAudio: boolean;
};

/** Groups are already shown by first line; `unknown` holds songs without an author. */
export type TAuthorsData = {
  book: TBookDescription;
  groups: Array<TContentGroup>;
  unknown?: TContentGroup;
};

/**/
export type TSearchData = {
  book: TBookDescription;
  pages: Array<TSearchPage>;
};

/**/
export type TAudioData = {
  book: TBookDescription;
  singers: Array<TSinger>;
  tracks: Array<TAudioTrack>;
};

/**/
export type TAudioSingerData = TAudioData & {
  selected: TSinger;
};

/**/
export type TSongData = {
  book: TBookDescription;
  descriptions: Array<TBookDescription>;  // Books that contain this song (includes the current one).
  nav: TNavItemsMap;
  song: TSong;
  telegraphUrl: string | null;
};

/** `bodyHtml` is the rendered markdown, so the client needs no markdown parser. */
export type TPageItemData = {
  book: TBookDescription;
  nav: TNavItemsMap;
  page: {
    bodyHtml: string;
    meta: TPageContent['meta'];
  };
};

/** `TRouteKind` differs from `TKind` only for songs and pages (both `item`). */
type TEnvelope<TKind extends string, TData, TRouteKind extends TRoute['kind'] = Extract<TKind, TRoute['kind']>> = {
  build: string;  // See `getBuildId`.
  data: TData;
  head: THead;
  kind: TKind;
  route: Extract<TRoute, { kind: TRouteKind }>;
};

/** Content of every page-data JSON file, discriminated by `kind`. */
export type TPageData =
  | TEnvelope<'book-list', TBookListData>
  | TEnvelope<'other', TBookListData>
  | TEnvelope<'contents', TIndexData>
  | TEnvelope<'a-z', TIndexData>
  | TEnvelope<'authors', TAuthorsData>
  | TEnvelope<'search', TSearchData>
  | TEnvelope<'audio', TAudioData>
  | TEnvelope<'audio-singer', TAudioSingerData>
  | TEnvelope<'song', TSongData, 'item'>
  | TEnvelope<'page', TPageItemData, 'item'>;

/**/
export type TPageKind = TPageData['kind'];

/** Every page of a songbook in one file, keyed by data URL; used to precache a book for offline use. */
/** Site-relative images every songbook shares (`/shell/assets.json`); the worker cannot list directories. */
export type TSharedAssets = {
  /** Covers and thumbnails of all songbooks, both densities. */
  bookImages: Array<string>;
  /** Files of `/images/svg/` (logo), sorted. */
  shell: Array<string>;
};

export type TBookBundle = {
  /** Site-relative files the service worker caches with the book; logos and covers are in `TSharedAssets`. */
  assets: {
    /** `/images/resources/**` used by this book. */
    contentImages: Array<string>;
  };
  build: string;
  pages: Record<string, TPageData>;
};

/** Page data of one kind. */
export type TPageDataOf<K extends TPageKind> = Extract<TPageData, { kind: K }>;
