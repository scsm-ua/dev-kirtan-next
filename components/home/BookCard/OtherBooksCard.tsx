import './BookCard.scss';
import { PATH } from '@/other/constants';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { translate } from '@/other/i18n';

type Props = {
  bookId: string;
  bookIds: string[];
  count: number;
};

function OtherBooksCard({ bookId, bookIds, count }: Props) {
  const subtitle = translate(bookId, 'BOOK_LIST_PAGE.OTHER_SONGBOOKS');

  return (
    <li className="BookCard BookCard--other">
      <div className="BookCard__container">
        <div className="BookCard__ratio app-fixed-ratio-container">
          <div className="app-fixed-ratio-content">
            <a
              aria-label={subtitle}
              className="BookCard__link"
              href={getSongbookPagePath(bookId, SONGBOOK_PAGE.OTHER)}
            >
              <div className="BookCard__box BookCard__box--other">
                <div aria-hidden="true" className="BookCard__otherCovers">
                  {bookIds.map((id) => (
                    <img
                      alt=""
                      className="BookCard__otherCover"
                      key={id}
                      src={`${PATH.IMG.COVER}banner-${id}.jpg`}
                    />
                  ))}
                </div>
                <div aria-hidden="true" className="BookCard__otherDetails">
                  <span className="icon-book BookCard__otherIcon" />
                  <span className="BookCard__otherMore">...</span>
                </div>
              </div>
              <div className="BookCard__info">
                <h4 aria-hidden="true" className="BookCard__title BookCard__title--empty" />
                <div className="ellipsis BookCard__subtitle">{subtitle}</div>
                <div className="BookCard__count">{count}</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}

export default OtherBooksCard;
