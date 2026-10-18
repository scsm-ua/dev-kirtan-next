import type { Metadata } from 'next';

import type { TBookDescription } from '@/types/book';
import type { TItemType } from '@/types/common';
import type { TNavItemsMap } from '@/types/song';

/**
 * Route context passed to `getMeta`.
 */
export type TMetaCtx = {
  bookId: string;
  slug: string;
};

/**
 * Props every content body component receives from the shared route.
 * Type-specific data (TSong, TPage, …) comes in `data`. The body components
 * themselves live in `components/content` (see its registry) so this module
 * stays React-free and the export builder can import handlers without
 * dragging the component tree (and its styles) into the export page.
 */
export type TContentBodyProps<TData> = {
  book: TBookDescription;
  bookId: string;
  data: TData;
  nav: TNavItemsMap;
  slug: string;
};

/**
 * Per-item-type strategy. Song and page are sibling implementations; the
 * `type` discriminator (derived at import stage) is the only dispatch key.
 */
export interface ContentHandler<TData> {
  type: TItemType;
  // Extra class on export TOC/first-line entries ('' for none). The `page`
  // class lets the `withPages` filter drop entries with their section.
  indexEntryClass: string;
  load(slug: string, bookId: string): Promise<TData | null>;
  getMeta(data: TData, ctx: TMetaCtx): Promise<Partial<Metadata>> | Partial<Metadata>;
  // Songbook export section (pure HTML string — no react-dom/server).
  renderExport(data: TData, slug: string): string;
}
