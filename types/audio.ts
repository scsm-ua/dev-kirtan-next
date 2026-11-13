import type { TContentItem } from '@/types/common';

/**/
export type TSinger = {
  id: string;     // URL slug from the person record.
  name: string;   // Localized singer name.
  count: number;  // Number of recordings in the book.
};

/**/
export type TAudioTrack = {
  item: TContentItem;
  label: string;  // Song first line.
  order: number;  // Position in contents order.
  singerName: string;
  url: string;
};

/**
 * Playlist presentation:
 *   'firstLine' – first lines, sorted alphabetically
 *   'title'     – song titles, in contents order
 *   'shuffle'   – random order
 */
export type TAudioSort = 'firstLine' | 'title' | 'shuffle';

/**
 * Named ids for `TAudioSort`.
 */
export const AUDIO_SORT = {
  FIRST_LINE: 'firstLine',
  TITLE: 'title',
  SHUFFLE: 'shuffle'
} as const satisfies Record<string, TAudioSort>;
