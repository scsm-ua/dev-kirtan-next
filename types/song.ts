import type { TResource } from '@/types/resources';

/**/
export type TWbwEntry = { key: string[]; trans: string };

/**/
export type TInlineWbwError = 'multi' | 'mismatch';

/**/
export type TInlineWbwEntry = {
  text: string;
  trans: string;
  sep: string;
  error?: TInlineWbwError;
};

/**/
export type TSong = {
  author: Array<string>;
  // Derived server-side in `getSongBySlug`, not present in source JSON:
  hasWbw: boolean;
  hasVersesText: boolean;
  hasVersesTranslations: boolean;
  fullInlineWbw: boolean;
  meta: {
    author?: string;
    first_line?: string;
    'inline verse'?: 'non bold';
    page?: string | string[];
    translation?: 'no';
    'verse parentheses'?: 'non bold';
  };
  resources?: TResource;
  subtitle: Array<string>;
  title: Array<string>;
  verses: Array<TVerse>;
  word_by_word: Array<string>;
};

/**/
export type TVerse = {
  // Pre-built per-word inline rows, populated server-side when the verse
  // qualifies for inline word-by-word mode. Absent otherwise.
  inline_word_by_word?: TInlineWbwEntry[][];
  // Derived server-side: true when every `word_by_word` entry maps to a
  // single source word found in the verse text (i.e. inline Learn mode is
  // meaningful for this verse). Absent on verses without `word_by_word`.
  isWbwInlineModeAvailable?: boolean;
  number?: string;
  subtitle?: Array<string>;
  text: Array<string>;
  translation: Array<string>;
  word_by_word: Array<string>;
};

/**/
export type TNavItem = {
  path: string;
  title: string;
};

/**/
export type TNavItems = {
  prev: TNavItem | void;
  next: TNavItem | void;
};

/**/
export type TNavItemsMap = { [page: string]: TNavItems };
