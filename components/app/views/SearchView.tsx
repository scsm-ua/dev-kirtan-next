import './SearchPage.scss';
import BookDescription from '@/components/common/BookDescription/BookDescription';
import SearchModule from '@/components/search/SearchModule/SearchModule';

import type { TViewProps } from '@/components/app/views/types';

/**/
function SearchView({ extras, page }: TViewProps<'search'>) {
  return (
    <div className="Main__container SearchPage__container">
      <header className="SearchPage__header">
        <BookDescription bookDescription={page.data.book} />
      </header>

      <SearchModule bookId={page.route.bookId} pages={page.data.pages} />
      {extras}
    </div>
  );
}

/**/
export default SearchView;
