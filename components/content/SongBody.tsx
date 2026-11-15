import AudioList from '@/components/song/AudioList/AudioList';
import ContentShell from '@/components/content/ContentShell';
import OtherTranslations from '@/components/song/OtherTranslations/OtherTranslations';
import SongbookList from '@/components/song/OtherTranslations/SongbookList';
import SongHeader from '@/components/song/SongHeader';
import SongImage from '@/components/song/SongImage/SongImage';
import SongShare from '@/components/song/SongShare/SongShare';
import SongText from '@/components/song/SongText/SongText';
import { translate } from '@/other/i18n';

import type { TViewProps } from '@/components/app/views/types';

/**
 * Song item body: header (image, titles, author), verses, audio. `extras`
 * carries the server-rendered JSON-LD.
 */
function SongBody({ extras, page }: TViewProps<'song'>) {
  const { bookId, slug } = page.route;
  const { book, descriptions, nav, song, telegraphUrl } = page.data;

  return (
    <ContentShell
      after={extras}
      bookId={bookId}
      bookTitle={book.title}
      controls={
        <>
          <OtherTranslations
            bookId={bookId}
            // descriptions always include the current book, so 1 means no other translations
            disabled={descriptions.length < 2}
          >
            <SongbookList
              bookId={bookId}
              bookDescriptions={descriptions}
              slug={slug}
            />
          </OtherTranslations>

          <SongShare bookId={bookId} telegraphUrl={telegraphUrl} />
        </>
      }
      headerExtra={
        <>
          {song.resources?.image && (
            <SongImage
              alt={song.title.join(' ')}
              image={song.resources.image}
            />
          )}

          <SongHeader bookId={bookId} song={song} />
        </>
      }
      nav={nav}
      page={song.meta?.page}
    >
      <SongText
        bookId={bookId}
        label={translate(bookId, 'SONG_PAGE.SHOW_TRANSLATION')}
        song={song}
      />

      {song.resources?.audio?.length > 0 && (
        <AudioList
          audio={song.resources?.audio}
          bookId={bookId}
          caption={translate(bookId, 'SONG_PAGE.AUDIO_CAPTION')}
          offlineCaption={translate(bookId, 'SONG_PAGE.AUDIO_OFFLINE_CAPTION')}
          songTitle={song.title.join(' ')}
        />
      )}
    </ContentShell>
  );
}

/**/
export default SongBody;
