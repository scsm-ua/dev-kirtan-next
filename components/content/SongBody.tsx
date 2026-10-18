import AudioList from '@/components/song/AudioList/AudioList';
import ContentShell from '@/components/content/ContentShell';
import LdJsonSong from '@/other/metadata/LdJsonSong';
import OtherTranslations from '@/components/song/OtherTranslations/OtherTranslations';
import SongbookList from '@/components/song/OtherTranslations/SongbookList';
import SongHeader from '@/components/song/SongHeader';
import SongImage from '@/components/song/SongImage/SongImage';
import SongShare from '@/components/song/SongShare/SongShare';
import SongText from '@/components/song/SongText/SongText';
import { getBookDescriptionsByBook, getTelegraphUrl } from '@/lib/song';
import { getBooksMap } from '@/lib/books';
import { translate } from '@/other/i18n';

import type { TContentBodyProps } from '@/lib/content/handler';
import type { TBookDescription } from '@/types/book';
import type { TSong } from '@/types/song';

/**
 * Song item body: header (image, titles, author), verses, audio, JSON-LD.
 * Fetches song-only extras (other translations, Telegraph URL) itself so
 * other content types don't pay for them.
 */
async function SongBody({
  book,
  bookId,
  data: song,
  nav,
  slug
}: TContentBodyProps<TSong>) {
  const booksMap = await getBooksMap();
  const descriptions = (await getBookDescriptionsByBook(
    slug,
    booksMap
  )) as TBookDescription[];
  const telegraphUrl = await getTelegraphUrl(bookId, slug);

  return (
    <ContentShell
      after={<LdJsonSong bookId={bookId} slug={slug} song={song} />}
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
              alt={song.title?.join(' ') ?? ''}
              image={song.resources.image}
            />
          )}

          <SongHeader bookId={bookId} song={song} />
        </>
      }
      nav={nav}
      page={song.meta?.page}
      slug={slug}
    >
      <SongText
        bookId={bookId}
        label={translate(bookId, 'SONG_PAGE.SHOW_TRANSLATION')}
        song={song}
      />

      {song.resources?.audio?.length > 0 && (
        <AudioList
          audio={song.resources?.audio}
          caption={translate(bookId, 'SONG_PAGE.AUDIO_CAPTION')}
          language={bookId.slice(0, 2)}
        />
      )}
    </ContentShell>
  );
}

/**/
export default SongBody;
