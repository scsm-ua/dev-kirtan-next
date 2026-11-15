import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getAudioBookIdParamList } from '@/lib/audio';
import { getAudioPageMeta } from '@/other/metadata/getAudioPageMeta';
import { loadPageData } from '@/lib/pageData';
import LdJsonAudio from '@/other/metadata/LdJsonAudio';
import { SONGBOOK_PAGE } from '@/other/paths';

import type { BookListPageProps } from '@/types/book';

/**/
export const generateMetadata = getAudioPageMeta;
export const generateStaticParams = getAudioBookIdParamList;
export const dynamicParams = false;

/**
 *
 */
async function AudioIndexPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const page = await loadPageData({ kind: SONGBOOK_PAGE.AUDIO, bookId });
  if (page?.kind !== 'audio') notFound();

  const { book, tracks } = page.data;

  return (
    <AppDocument
      extras={
        <LdJsonAudio
          bookId={bookId}
          bookTitle={book.title_full_short || book.title}
          tracks={tracks}
        />
      }
      page={page}
    />
  );
}

/**/
export default AudioIndexPage;
