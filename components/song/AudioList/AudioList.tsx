'use client';

import './AudioList.scss';
import PlayerDock from '@/components/player/PlayerDock';
import PlayerWidget from '@/components/player/PlayerWidget';
import { getAudioSingerPath } from '@/other/paths';
import type { TAudio } from '@/types/resources';

/**/
type Props = {
  audio: Array<TAudio>;
  bookId: string;
  caption: string;
  songTitle: string;
};

function AudioList({ audio, bookId, caption, songTitle }: Props) {
  return (
    <section className="AudioList">
      {caption && <h2 className="AudioList__caption">{caption}</h2>}

      <ul className="AudioList__list">
        {audio.map((item: TAudio) => (
          <li className="AudioList__item" key={item.embed_url}>
            <PlayerWidget
              className="AudioList__player"
              source={{ url: item.embed_url }}
              subtitle={songTitle}
              title={item.title}
              trackInfo={{
                bookId,
                pageType: 'song',
                singer: item.title,
                title: songTitle
              }}
            />
            <a
              aria-label={item.title}
              className="AudioList__link"
              href={getAudioSingerPath(bookId, item.personSlug)}
              title={item.title}
            >
              <span className="AudioList__icon icon-chevron-right" />
            </a>
          </li>
        ))}
      </ul>

      <PlayerDock autoAdvance={false} />
    </section>
  );
}

/**/
export default AudioList;
