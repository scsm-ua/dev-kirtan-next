import classNames from 'classnames';

import './SongBookItem.scss';
import BookThumbnail from '@/components/common/BookThumnail/BookThumbnail';
import { getBookLangLabel } from '@/other/helpers';
import { TBookDescription } from '@/types/book';

/**/
type Props = {
  description: TBookDescription;
  href: string;
  isActive?: boolean;
};

/**
 *
 */
function SongBookItem({ description, href, isActive }: Props) {
  if (description.hidden) return null;

  const cls = (classNames as any)(
    'SongBookItem__title',
    isActive && 'SongBookItem__title--active'
  );

  return (
    <li className="SongBookItem">
      <a href={href}>
        <div className="SongBookItem__container">
          <BookThumbnail bookId={description.slug} />

          <div className="SongBookItem__info">
            <h5 className={cls}>
              <span className="SongBookItem__lang">{getBookLangLabel(description.slug)}</span>
              {description.title}
            </h5>

            <div className="ellipsis SongBookItem__subtitle">
              {description.subtitle}
            </div>
          </div>
        </div>
      </a>
    </li>
  );
}

/**/
export default SongBookItem;
