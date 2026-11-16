import './BookList.scss';
import BookCard from '@/components/home/BookCard/BookCard';
import BookListKeyNav from '@/components/home/BookList/BookListKeyNav';
import { compareBooks } from '@/scripts/compareHelpers';

import type { TBookDescription } from '@/types/book';
import type { TBooksMap } from '@/types/book';

/**/
type Props = {
  bookId: string;
  booksMap: TBooksMap;
};

/**
 *
 */
function BookList({ bookId, booksMap }: Props) {
  return (
    <div className="BookList">
      <BookListKeyNav />
      <div className="Main__content BookList__content">
        <ul className="BookList__list">
          <BookCard bookDescription={booksMap[bookId]} key={bookId} />

          {Object.entries(booksMap)
            .filter(([bid]: [string, TBookDescription]) => bid !== bookId)
            .sort((a, b) => compareBooks(a[1], b[1]))
            .map(([, book]: [string, TBookDescription]) => (
              <BookCard bookDescription={book} key={book.slug} />
            ))}
        </ul>
      </div>
    </div>
  );
}

/**/
export default BookList;
