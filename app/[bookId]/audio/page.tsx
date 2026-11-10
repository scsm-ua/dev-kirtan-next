import AudioPage from '@/components/audio/AudioPage';
import BookDescription from '@/components/common/BookDescription/BookDescription';
import { getAudioPageMeta } from '@/other/metadata/getAudioPageMeta';
import { getAudioBookIdParamList, getSingers } from '@/lib/audio';
import { getBooksMap } from '@/lib/books';
import Layout from '@/components/common/Layout/Layout';
import LdJson from '@/other/metadata/LdJson';
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
  const book = getBooksMap()[bookId];

  return (
    <Layout bookId={bookId}>
      <div className="Main__container AudioPage">
        <div className="IndexPage__title">
          <BookDescription bookDescription={book} />
        </div>

        <div className="Main__content">
          <AudioPage bookId={bookId} singers={getSingers(bookId)} />
        </div>

        <LdJson bookId={bookId} pageKey="AUDIO_PAGE" page={SONGBOOK_PAGE.AUDIO} />
      </div>
    </Layout>
  );
}

/**/
export default AudioIndexPage;
