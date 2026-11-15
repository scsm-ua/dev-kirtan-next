import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getAudioSingerPageMeta } from '@/other/metadata/getAudioPageMeta';
import { getSingerParamList } from '@/lib/audio';
import { loadPageData } from '@/lib/pageData';
import LdJsonAudio from '@/other/metadata/LdJsonAudio';

import type { SingerPageProps } from '@/types/book';

/**/
export const generateMetadata = getAudioSingerPageMeta;
export const generateStaticParams = getSingerParamList;
export const dynamicParams = false;

/**
 *
 */
async function AudioSingerPage({ params }: SingerPageProps) {
  const { bookId, singerId } = await params;
  const page = await loadPageData({ kind: 'audio-singer', bookId, singerId });
  if (page?.kind !== 'audio-singer') notFound();

  const { book, selected, tracks } = page.data;

  return (
    <AppDocument
      extras={
        <LdJsonAudio
          bookId={bookId}
          bookTitle={book.title_full_short || book.title}
          selected={selected}
          tracks={tracks}
        />
      }
      page={page}
    />
  );
}

/**/
export default AudioSingerPage;
