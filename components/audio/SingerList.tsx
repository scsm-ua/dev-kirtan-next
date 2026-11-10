import classNames from 'classnames';

import './SingerList.scss';
import { getAudioSingerPath } from '@/other/paths';

import type { TSinger } from '@/types/audio';

/**/
type Props = {
  bookId: string;
  singers: Array<TSinger>;
  selectedId?: string;
};

/**
 *
 */
function SingerList({ bookId, singers, selectedId }: Props) {
  return (
    <nav className="SingerList">
      <ul className="SingerList__list">
        {singers.map((singer: TSinger) => {
          const isActive = singer.id === selectedId;

          return (
            <li key={singer.id}>
              <a
                aria-current={isActive ? 'page' : undefined}
                className={classNames('SingerList__link', isActive && 'SingerList__link--active')}
                href={getAudioSingerPath(bookId, singer.id)}
              >
                <span className="SingerList__name">{singer.name}</span>
                <span className="SingerList__count">{singer.count}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**/
export default SingerList;
