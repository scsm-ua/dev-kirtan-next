import { pageHandler } from '@/lib/content/page';
import { songHandler } from '@/lib/content/song';
import { ITEM_TYPE } from '@/types/common';

import type { ContentHandler } from '@/lib/content/handler';
import type { TItemType } from '@/types/common';

/**/
const CONTENT_HANDLERS = {
  [ITEM_TYPE.SONG]: songHandler,
  [ITEM_TYPE.PAGE]: pageHandler
} satisfies Record<TItemType, ContentHandler<unknown>>;

/**
 * Resolves the handler for an item type. Falls back to `song` (safe default,
 * matches items built before the `type` discriminator existed).
 */
export function getContentHandler(type?: TItemType): ContentHandler<unknown> {
  return CONTENT_HANDLERS[type ?? ITEM_TYPE.SONG];
}
