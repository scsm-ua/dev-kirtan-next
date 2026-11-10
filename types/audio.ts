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
  url: string;
};
