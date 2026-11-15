import AZ from '@/components/a-z/AZ';
import BookDescription from '@/components/common/BookDescription/BookDescription';
import Pills from '@/components/common/Pills/Pills';
import { translate } from '@/other/i18n';

import type { TContentGroup } from '@/types/common';
import type { TViewProps } from '@/components/app/views/types';

/**/
function AZView({ extras, page }: TViewProps<'a-z'>) {
  const { bookId } = page.route;
  const { book, groups, hasAudio } = page.data;
  const items = groups.map((item: TContentGroup) => ({ title: item.name }));

  return (
    <div className="Main__container AZ">
      <div className="IndexPage__title">
        <BookDescription bookDescription={book} />
      </div>

      <div className="Main__content">
        <h1 className="AZ__title">{translate(bookId, 'A_Z_PAGE.LINK_FULL_TITLE')}</h1>

        <div className="AZ__list">
          <Pills items={items} />
        </div>

        <AZ bookId={bookId} contents={groups} hasAudio={hasAudio} shortcuts={book.shortcuts ?? []} />
      </div>

      {extras}
    </div>
  );
}

/**/
export default AZView;
