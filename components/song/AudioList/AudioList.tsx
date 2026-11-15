'use client';

import './AudioList.scss';
import PlayerWidget from '@/components/player/PlayerWidget';
import { useIsOnline } from '@/other/hooks/useIsOnline';
import { getAudioSingerPath } from '@/other/paths';
import type { TAudio } from '@/types/resources';

/**/
type Props = {
  audio: Array<TAudio>;
  bookId: string;
  caption: string;
  offlineCaption: string;
  songTitle: string;
};

function AudioList({ audio, bookId, caption, offlineCaption, songTitle }: Props) {
  const isOnline = useIsOnline();
  const text = isOnline ? caption : offlineCaption;

  return (
    <section className="AudioList">
      {text && <h2 className="AudioList__caption">{text}</h2>}

      <ul className="AudioList__list">
        {audio.map((item: TAudio) => (
          <li className="AudioList__item" key={item.embed_url}>
            <PlayerWidget
              autoAdvance={false}
              className="AudioList__player"
              disabled={!isOnline}
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
    </section>
  );
}

/**/
export default AudioList;
