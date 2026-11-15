import type { Metadata } from 'next';

import type { TItemType } from '@/types/common';

/**
 * Route context passed to `getMeta`.
 */
export type TMetaCtx = {
  bookId: string;
  slug: string;
};

/**
 * Per-item-type strategy. Song and page are sibling implementations; the
 * `type` discriminator (derived at import stage) is the only dispatch key.
 * React-free, so the export builder can use handlers without pulling the
 * view components (and their styles) into the bare export page.
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
