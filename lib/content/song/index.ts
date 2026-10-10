import { getSongBySlug } from '@/lib/song';
import { getSongMeta } from '@/lib/content/song/meta';
import { renderSong } from '@/lib/content/song/export';
import { ITEM_TYPE } from '@/types/common';

import type { ContentHandler } from '@/lib/content/handler';
import type { TSong } from '@/types/song';

/**/
export const songHandler: ContentHandler<TSong> = {
  type: ITEM_TYPE.SONG,
  indexEntryClass: '',
  load: getSongBySlug,
  getMeta: getSongMeta,
  renderExport: renderSong
};
