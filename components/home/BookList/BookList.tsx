import './BookList.scss';
import BookCard from '@/components/home/BookCard/BookCard';
import OtherBooksCard from '@/components/home/BookCard/OtherBooksCard';
import BookListKeyNav from '@/components/home/BookList/BookListKeyNav';
import PrevNextLink from '@/components/song/PrevNextNav/PrevNextLink';
import { getSongbookPath } from '@/other/paths';
import { translate } from '@/other/i18n';
import { compareBooks } from '@/scripts/compareHelpers';

import type { TBookDescription } from '@/types/book';
import type { TBooksMap } from '@/types/book';

/**/
type Props = {
  bookId: string;
  booksMap: TBooksMap;
  other?: boolean;
};

/**
 *
 */
function BookList({ bookId, booksMap, other = false }: Props) {
  const otherBooks = Object.values(booksMap)
    .filter((book) => book.is_legacy && !book.hidden)
    .sort(compareBooks);
  const otherBookThumbnails = otherBooks
    .filter(({ is_legacy }) => typeof is_legacy === 'object' && is_legacy.show_micro_thumbnail_on_main);

  return (
    <div className="BookList">
      <BookListKeyNav />
      <div className="Main__content BookList__content">
        {other && (
          <div className="BookList__back">
            <PrevNextLink dir="prev" item={{ path: getSongbookPath(bookId), title: translate(bookId, 'BOOK_LIST_PAGE.BACK') }} />
          </div>
        )}
        <ul className="BookList__list">
          {!other && <BookCard bookDescription={booksMap[bookId]} key={bookId} showHidden />}

          {Object.entries(booksMap)
            .filter(([bid, book]: [string, TBookDescription]) =>
              other ? !!book.is_legacy : bid !== bookId && !book.is_legacy
            )
            .sort((a, b) => compareBooks(a[1], b[1]))
            .map(([, book]: [string, TBookDescription]) => (
              <BookCard bookDescription={book} key={book.slug} />
            ))}
          {!other && otherBooks.length > 0 && (
            <OtherBooksCard
              bookId={bookId}
              bookIds={otherBookThumbnails.map(({ slug }) => slug)}
              count={otherBooks.length}
            />
          )}
        </ul>
      </div>
    </div>
  );
}

/**/
export default BookList;
