import './Playlist.scss';
import PlayerDock from '@/components/player/PlayerDock';
import PlayerWidget from '@/components/player/PlayerWidget';
import PlaylistLink from '@/components/audio/PlaylistLink';
import { getSongPathWithPage } from '@/other/paths';
import { translate } from '@/other/i18n';

import type { TAudioTrack } from '@/types/audio';

/**/
type Props = {
  bookId: string;
  singerName: string;
  tracks: Array<TAudioTrack>;
};

/**
 *
 */
function Playlist({ bookId, singerName, tracks }: Props) {
  return (
    <>
      <ul className="Playlist">
        {tracks.map((track: TAudioTrack, index: number) => {
          const { item } = track;
          const page = Array.isArray(item.page) ? item.page.join(', ') : item.page;

          return (
            <li className="Playlist__item" key={`${index}-${track.url}`}>
              <PlayerWidget
                className="Playlist__player"
                source={{ url: track.url }}
                subtitle={singerName}
                title={track.label}
              />

              <PlaylistLink className="Playlist__link" href={getSongPathWithPage(bookId, item)} title={item.title}>
                {page && (
                  <span
                    className="Playlist__page"
                    title={translate(bookId, 'SONG_PAGE.PAGE_IN_PAPER_SONGBOOK')}
                  >
                    {page}
                  </span>
                )}
                <span className="Playlist__icon icon-chevron-right" />
              </PlaylistLink>
            </li>
          );
        })}
      </ul>

      <PlayerDock />
    </>
  );
}

/**/
export default Playlist;
