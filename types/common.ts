/**/
export type TPill = {
  // page: string;
  // path: string;
  title: string;
  // type?: string;
};

/**/
export type TContentGroup = {
  items: Array<TContentItem>;
  name?: string;
};

/**/
export type TContentItem = {
  aliasName: string;    // The first line of the first verse.
  altAliasNames?: string[]; // Additional first lines used for the index page.
  // author?: string;      // not used at the moment
  id: string;           // Slug of the song.
  page: string;
  pages: Array<string>; // Contains more than one item if page has duplicates.
  title: string;        // Human-readable title.
  has: {
    audio: boolean;
    translation: boolean;
  }
};
/**
 * What the user wants to see in the song body:
 *   'all'         – verses + translation
 *   'verse'       – original verses only
 *   'translation' – translation only
 */
export type TViewMode = 'all' | 'verse' | 'translation';

/**
 * Named ids for `TViewMode`. Prefer these constants over raw string
 * literals so the meaning is self-evident at call sites.
 */
export const VIEW_MODE = {
  ALL: 'all',
  VERSE: 'verse',
  TRANSLATION: 'translation'
} as const satisfies Record<string, TViewMode>;

/**
 * Word-by-word presentation:
 *   'hide'      – no per-word translation
 *   'inline'    – inline column pairs ("learn" view)
 *   'classical' – separate block under the translation
 */
export type TWbwMode = 'hide' | 'inline' | 'classical';

/**
 * Named ids for `TWbwMode`.
 */
export const WBW_MODE = {
  HIDE: 'hide',
  INLINE: 'inline',
  CLASSICAL: 'classical'
} as const satisfies Record<string, TWbwMode>;

/**/
declare global {
  interface Window {
    SC: {
      Widget: any;
    };
  }
}
