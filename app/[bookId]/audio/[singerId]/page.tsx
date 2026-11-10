import { notFound } from 'next/navigation';

import AudioPage from '@/components/audio/AudioPage';
import BookDescription from '@/components/common/BookDescription/BookDescription';
import { getAudioSingerPageMeta } from '@/other/metadata/getAudioPageMeta';
import { getSingerParamList, getSingers, getSingerTracks } from '@/lib/audio';
import { getBooksMap } from '@/lib/books';
import Layout from '@/components/common/Layout/Layout';
import LdJson from '@/other/metadata/LdJson';
import { getAudioSingerPage } from '@/other/paths';

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
  const book = getBooksMap()[bookId];
  const singers = getSingers(bookId);
  const selected = singers.find((singer) => singer.id === singerId);

  if (!selected) notFound();

  return (
    <Layout bookId={bookId}>
      <div className="Main__container AudioPage">
        <div className="IndexPage__title">
          <BookDescription bookDescription={book} />
        </div>

        <div className="Main__content">
          <AudioPage
            bookId={bookId}
            selected={selected}
            singers={singers}
            tracks={getSingerTracks(bookId, singerId)}
          />
        </div>

        <LdJson bookId={bookId} pageKey="AUDIO_PAGE" page={getAudioSingerPage(singerId)} />
      </div>
    </Layout>
  );
}

/**/
export default AudioSingerPage;
