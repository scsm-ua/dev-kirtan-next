import { getSingers, getSingerTracks } from '@/lib/audio';
import { getAudioSingerPageMeta } from '@/other/metadata/getAudioPageMeta';
import LdJsonAudio from '@/other/metadata/LdJsonAudio';
import { ROUTE_KIND } from '@/other/router/routes';

import type { TServerRoute } from '@/lib/pageData/routes/types';

/** Playlist of one singer: `/<bookId>/audio/<singerId>/`. */
export const audioSingerRoute: TServerRoute<'audio-singer'> = {
  jsonLd: ({ data: { book, selected, tracks }, route }) => (
    <LdJsonAudio
      bookId={route.bookId}
      bookTitle={book.title_full_short || book.title}
      selected={selected}
      tracks={tracks}
    />
  ),

  /** A book without audio has no singers. */
  list: (bookId) =>
    getSingers(bookId).map((singer) => ({ kind: ROUTE_KIND.AUDIO_SINGER, bookId, singerId: singer.id })),

  async load({ bookId, singerId }, book) {
    const singers = getSingers(bookId);
    const selected = singers.find((singer) => singer.id === singerId);
    if (!selected) return null;

    return {
      data: { book, selected, singers, tracks: getSingerTracks(bookId, singerId) },
      kind: ROUTE_KIND.AUDIO_SINGER
    };
  },

  meta: ({ bookId, singerId }) =>
    getAudioSingerPageMeta({ params: Promise.resolve({ bookId, singerId }) }),

  sitemap: { priority: 0.8 }
};
