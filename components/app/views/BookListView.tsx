import BookList from '@/components/home/BookList/BookList';

import type { TViewProps } from '@/components/app/views/types';

/**/
function BookListView({ extras, page }: TViewProps<'book-list'>) {
  return (
    <>
      <BookList bookId={page.route.bookId} booksMap={page.data.booksMap} />
      {extras}
    </>
  );
}

/**/
export default BookListView;
