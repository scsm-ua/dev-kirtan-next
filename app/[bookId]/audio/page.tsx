import AudioPage from '@/components/audio/AudioPage';
import BookDescription from '@/components/common/BookDescription/BookDescription';
import { getAudioPageMeta } from '@/other/metadata/getAudioPageMeta';
import { getAudioBookIdParamList, getSingers, getSingerTracks } from '@/lib/audio';
import { getBooksMap } from '@/lib/books';
import Layout from '@/components/common/Layout/Layout';
import { SONGBOOK_PAGE } from '@/other/paths';
import LdJsonAudio from '@/other/metadata/LdJsonAudio';

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
  const book = getBooksMap()[bookId];
  const tracks = getSingerTracks(bookId);

  return (
    <Layout bookId={bookId} pageType={SONGBOOK_PAGE.AUDIO}>
      <div className="Main__container AudioPage">
        <div className="IndexPage__title">
          <BookDescription bookDescription={book} />
        </div>

        <div className="Main__content">
          <AudioPage bookId={bookId} singers={getSingers(bookId)} tracks={tracks} />
        </div>

        <LdJsonAudio
          bookId={bookId}
          bookTitle={book.title_full_short || book.title}
          tracks={tracks}
        />
      </div>
    </Layout>
  );
}

/**/
export default AudioIndexPage;
