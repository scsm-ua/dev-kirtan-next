'use client';

import './BookCard.scss';
import { displayVersionInfo } from '@/other/displayVersion';
import { PATH } from '@/other/constants';
import { saveBookChoice } from '@/other/userPreferrences';
import { translate } from '@/other/i18n';
import { useHiddenBooks } from '@/other/hooks/useHiddenBooks';

import type { TBookDescription } from '@/types/book';

/**/
type Props = {
  bookDescription: TBookDescription;
};

/**/
displayVersionInfo();

/**
 *
 */
function BookCard({ bookDescription }: Props) {
  const { hidden, slug, songsCount, subtitle, title } = bookDescription;
  if (!useHiddenBooks(hidden)) return null;

  const handleClick = () => saveBookChoice(slug);
  const href = '/' + slug + PATH.PAGE.A_Z;

  const src = PATH.IMG.COVER + 'banner-' + slug + '.jpg';
  const srcSet =
    PATH.IMG.COVER +
    'banner-' +
    slug +
    '.jpg 1x,' +
    PATH.IMG.COVER +
    'banner-' +
    slug +
    '@2.jpg 2x';

  return (
    <li className="BookCard" onClick={handleClick}>
      <div className="BookCard__container">
        <div className="BookCard__ratio app-fixed-ratio-container">
          <div className="app-fixed-ratio-content">
            <a href={href} className="BookCard__link">
              <div className="BookCard__box">
                <img
                  alt=""
                  className="BookCard__image"
                  srcSet={srcSet}
                  src={src}
                />
              </div>

              <div className="BookCard__info">
                <h4 className="BookCard__title">{title}</h4>
                <div className="ellipsis BookCard__subtitle">{subtitle}</div>

                <div className="BookCard__count">
                  {songsCount} {translate(slug, 'BOOK_LIST_PAGE.SONG_COUNT')}
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}

/**/
export default BookCard;
