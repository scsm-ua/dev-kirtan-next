import { getSingers, getSingerTracks, hasBookAudio } from '@/lib/audio';
import { getAudioPageMeta } from '@/other/metadata/getAudioPageMeta';
import LdJsonAudio from '@/other/metadata/LdJsonAudio';
import { ROUTE_KIND } from '@/other/router/routes';

import type { TServerRoute } from '@/lib/pageData/routes/types';

/** All recordings of a book: `/<bookId>/audio/`. Only books with audio have it. */
export const audioRoute: TServerRoute<'audio'> = {
  jsonLd: ({ data: { book, tracks }, route }) => (
    <LdJsonAudio
      bookId={route.bookId}
      bookTitle={book.title_full_short || book.title}
      tracks={tracks}
    />
  ),

  list: (bookId) => (hasBookAudio(bookId) ? [{ kind: ROUTE_KIND.AUDIO, bookId }] : []),

  async load({ bookId }, book) {
    if (!hasBookAudio(bookId)) return null;

    return {
      data: { book, singers: getSingers(bookId), tracks: getSingerTracks(bookId) },
      kind: ROUTE_KIND.AUDIO
    };
  },

  meta: ({ bookId }) => getAudioPageMeta({ params: Promise.resolve({ bookId }) }),

  sitemap: { priority: 0.8 }
};
