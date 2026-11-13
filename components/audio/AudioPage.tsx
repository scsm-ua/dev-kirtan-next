import './AudioPage.scss';
import '@/styles/index-page.scss';

import Playlist from '@/components/audio/Playlist';
import SingerList from '@/components/audio/SingerList';
import { translate } from '@/other/i18n';

import type { TAudioTrack, TSinger } from '@/types/audio';

/**/
type Props = {
  bookId: string;
  singers: Array<TSinger>;
  selected?: TSinger;
  tracks?: Array<TAudioTrack>;
};

/**
 *
 */
function AudioPage({ bookId, singers, selected, tracks }: Props) {
  return (
    <>
      <h1 className="AudioPage__title">{translate(bookId, 'AUDIO_PAGE.LINK_FULL_TITLE')}</h1>

      <SingerList bookId={bookId} selectedId={selected?.id} singers={singers} />

      {tracks && (
        <section className="AudioPage__playlist" id="audio-playlist">
          <header className="AudioPage__header">
            <h2 className="AudioPage__singer">
              {selected?.name ?? translate(bookId, 'AUDIO_PAGE.ALL_RECORDINGS')}
            </h2>
          </header>

          <Playlist bookId={bookId} showSinger={!selected} tracks={tracks} />
        </section>
      )}
    </>
  );
}

/**/
export default AudioPage;
