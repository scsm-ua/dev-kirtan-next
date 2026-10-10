import PageBody from '@/components/content/PageBody';
import SongBody from '@/components/content/SongBody';
import { ITEM_TYPE } from '@/types/common';

import type { ReactNode } from 'react';
import type { TContentBodyProps } from '@/lib/content/handler';
import type { TItemType } from '@/types/common';

/**
 * Bivariant signature (method-syntax trick) so concrete bodies
 * (TContentBodyProps<TSong>, <TPage>) are assignable to the map.
 */
type TBodyComponent = {
  fn(props: TContentBodyProps<unknown>): ReactNode | Promise<ReactNode>;
}['fn'];

/**
 * Body components per item type. Kept apart from `lib/content` handlers so
 * the export builder can use handlers without pulling the component tree
 * (and its styles) into the bare export page.
 */
const CONTENT_BODIES = {
  [ITEM_TYPE.SONG]: SongBody,
  [ITEM_TYPE.PAGE]: PageBody
} satisfies Record<TItemType, TBodyComponent>;

/**
 * Falls back to the song body (matches `getContentHandler`).
 */
export function getContentBody(type?: TItemType): TBodyComponent {
  return CONTENT_BODIES[type ?? ITEM_TYPE.SONG];
}
