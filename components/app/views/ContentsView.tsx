import BookDescription from '@/components/common/BookDescription/BookDescription';
import Contents from '@/components/contents/Contents';

import type { TViewProps } from '@/components/app/views/types';

/**/
function ContentsView({ extras, page }: TViewProps<'contents'>) {
  const { book, groups, hasAudio } = page.data;

  return (
    <div className="Main__container Contents">
      <div className="IndexPage__title">
        <BookDescription bookDescription={book} />
      </div>

      <div className="Main__content">
        <Contents bookId={page.route.bookId} contents={groups} hasAudio={hasAudio} shortcuts={book.shortcuts ?? []} />
      </div>

      {extras}
    </div>
  );
}

/**/
export default ContentsView;
