import classNames from 'classnames';

import './SingerList.scss';
import '@/components/player/PlayToggle.scss';
import { PlayIcon } from '@/components/player/icons';
import PlayerSyncToggle from '@/components/player/PlayerSyncToggle';
import SingerListCollapse from './SingerListCollapse';
import { translate } from '@/other/i18n';
import {
  AUTOPLAY_PARAM,
  getAudioSingerPath,
  getSongbookPagePath,
  SONGBOOK_PAGE
} from '@/other/paths';

import type { TSinger } from '@/types/audio';

/**/
const VISIBLE_COUNT = 5;

/**/
type Props = {
  bookId: string;
  singers: Array<TSinger>;
  selectedId?: string;
};

/** Real toggle on the open page; elsewhere a link that opens the page and starts its first track. */
function RowPlay({ href, isActive }: { href: string; isActive: boolean }) {
  if (isActive) return <PlayerSyncToggle className="SingerList__play" />;

  return (
    <a
      aria-label="Play"
      className="PlayToggle SingerList__play"
      href={`${href}?${AUTOPLAY_PARAM}=1`}
      rel="nofollow"
    >
      <PlayIcon />
    </a>
  );
}

/**
 *
 */
function SingerList({ bookId, singers, selectedId }: Props) {
  const total = singers.reduce((sum, singer) => sum + singer.count, 0);
  const isAllActive = !selectedId;
  const allHref = getSongbookPagePath(bookId, SONGBOOK_PAGE.AUDIO);
  const isCollapsible = singers.length > VISIBLE_COUNT;
  const selectedIndex = singers.findIndex((singer) => singer.id === selectedId);
  const start = Math.max(
    0,
    Math.min(selectedIndex - Math.floor((VISIBLE_COUNT - 1) / 2), singers.length - VISIBLE_COUNT)
  );

  const list = (
      <ul className="SingerList__list">
        <li className={classNames('SingerList__item', isAllActive && 'SingerList__item--active')}>
          <RowPlay href={allHref} isActive={isAllActive} />
          <a
            aria-current={isAllActive ? 'page' : undefined}
            className={classNames('SingerList__link', isAllActive && 'SingerList__link--active')}
            href={allHref}
          >
            <span className="SingerList__name">{translate(bookId, 'AUDIO_PAGE.ALL_RECORDINGS')}</span>
            <span className="SingerList__count">{total}</span>
          </a>
        </li>
        {singers.map((singer: TSinger, index: number) => {
          const isActive = singer.id === selectedId;
          const href = getAudioSingerPath(bookId, singer.id);
          const isExtra = isCollapsible && (index < start || index >= start + VISIBLE_COUNT);

          return (
            <li
              className={classNames(
                'SingerList__item',
                isActive && 'SingerList__item--active',
                isExtra && 'SingerList__item--extra'
              )}
              key={singer.id}
            >
              <RowPlay href={href} isActive={isActive} />
              <a
                aria-current={isActive ? 'page' : undefined}
                className={classNames('SingerList__link', isActive && 'SingerList__link--active')}
                href={href}
              >
                <span className="SingerList__name">{singer.name}</span>
                <span className="SingerList__count">{singer.count}</span>
              </a>
            </li>
          );
        })}
      </ul>
  );

  return (
    <nav className="SingerList">
      {isCollapsible ? (
        <SingerListCollapse count={singers.length} label={translate(bookId, 'AUDIO_PAGE.SHOW_ALL')}>
          {list}
        </SingerListCollapse>
      ) : (
        list
      )}
    </nav>
  );
}

/**/
export default SingerList;
