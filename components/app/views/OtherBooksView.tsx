import BookList from '@/components/home/BookList/BookList';

import type { TViewProps } from '@/components/app/views/types';

function OtherBooksView({ page }: TViewProps<'other'>) {
  return <BookList bookId={page.route.bookId} booksMap={page.data.booksMap} other />;
}

export default OtherBooksView;