import AuthorBadges from '@/components/authors/AuthorBadges';
import Authors from '@/components/authors/Authors';
import BookDescription from '@/components/common/BookDescription/BookDescription';

import type { TViewProps } from '@/components/app/views/types';

/**/
function AuthorsView({ extras, page }: TViewProps<'authors'>) {
  const { book, groups, unknown } = page.data;

  return (
    <div className="Main__container Authors">
      <div className="IndexPage__title">
        <BookDescription bookDescription={book} />
      </div>

      <div className="Main__content">
        <AuthorBadges contents={groups} />
        <Authors bookId={page.route.bookId} contents={groups} unknown={unknown} />
      </div>

      {extras}
    </div>
  );
}

/**/
export default AuthorsView;
