import { getSongBySlug } from '@/lib/song';
import { getSongMeta } from '@/lib/content/song/meta';
import { renderSong } from '@/lib/content/song/export';
import {
  getImagesMeta,
  localizeResourceImages,
  type TImageRenderer
} from '@/lib/content/resourceImages';
import { ITEM_TYPE } from '@/types/common';

import type { ContentHandler } from '@/lib/content/handler';
import type { TSong } from '@/types/song';

/**
 * Song lines strip raw tags (processTranslationLines), so keep markdown and
 * carry the intrinsic size in a `=WxH` suffix for the <img> generator there.
 */
const renderSongImage: TImageRenderer = (alt, src, meta) =>
  meta ? `![${alt}](${src} =${meta.width}x${meta.height})` : `![${alt}](${src})`;

/**
 * Loads a song and localizes resource-repo images in verse translations
 * (the only place songs carry images), so app view and export share them.
 */
async function loadSong(slug: string, bookId: string): Promise<TSong | null> {
  const song = await getSongBySlug(slug, bookId);
  if (!song) return null;

  const images = await getImagesMeta();
  for (const v of song.verses ?? []) {
    v.translation = v.translation?.map((l) =>
      localizeResourceImages(l, images, renderSongImage)
    );
  }
  return song;
}

/**/
export const songHandler: ContentHandler<TSong> = {
  type: ITEM_TYPE.SONG,
  indexEntryClass: '',
  load: loadSong,
  getMeta: getSongMeta,
  renderExport: renderSong
};
