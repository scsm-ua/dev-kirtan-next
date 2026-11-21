'use client';
/* eslint-disable @next/next/no-img-element */

import './BookCard.scss';
import CacheLed from '@/components/common/CacheStatus/CacheLed';
import { displayVersionInfo } from '@/other/displayVersion';
import { getBookLangLabel } from '@/other/helpers';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { PATH } from '@/other/constants';
import { saveBookChoice } from '@/other/userPreferrences';
import { translate } from '@/other/i18n';
import {
  useBookCacheState,
  useIsBookReachable
} from '@/other/hooks/useCacheStatus';

import type { TBookDescription } from '@/types/book';

/**/
type Props = {
  bookDescription: TBookDescription;
  showHidden?: boolean;
};

/**/
displayVersionInfo();

/**
 *
 */
function BookCard({ bookDescription, showHidden = false }: Props) {
  const { hidden, slug, songsCount, subtitle, title } = bookDescription;
  const isCached = useBookCacheState(slug) === 'cached';
  // Offline and not cached: greyed out, not a link.
  const isDisabled = !useIsBookReachable()(slug);
  if (hidden && !showHidden) return null;

  const handleClick = () => {
    if (!isDisabled) saveBookChoice(slug);
  };
  const href = getSongbookPagePath(slug, SONGBOOK_PAGE.A_Z);

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

  const content = (
    <>
      <div className="BookCard__box">
        <img alt="" className="BookCard__image" srcSet={srcSet} src={src} />
        <span className="BookCard__lang">{getBookLangLabel(slug)}</span>
      </div>

      <div className="BookCard__info">
        <h4 className="BookCard__title">{title}</h4>
        <div className="ellipsis BookCard__subtitle">{subtitle}</div>

        <div className="BookCard__count">
          {songsCount} {translate(slug, 'BOOK_LIST_PAGE.SONG_COUNT')}
        </div>
      </div>

      {isCached && (
        <span className="BookCard__cached">
          <CacheLed
            label={translate(slug, 'OFFLINE.AVAILABLE')}
            state="cached"
          />
        </span>
      )}
    </>
  );

  return (
    <li
      className={isDisabled ? 'BookCard BookCard--disabled' : 'BookCard'}
      onClick={handleClick}
    >
      <div className="BookCard__container">
        <div className="BookCard__ratio app-fixed-ratio-container">
          <div className="app-fixed-ratio-content">
            {isDisabled ? (
              <div aria-disabled="true" className="BookCard__link">
                {content}
              </div>
            ) : (
              <a className="BookCard__link" href={href}>
                {content}
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/**/
export default BookCard;
