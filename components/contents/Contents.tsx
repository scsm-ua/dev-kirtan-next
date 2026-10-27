import './Contents.scss';
import '@/styles/index-page.scss';

import ContentGroup from '@/components/contents/ContentGroup';
import IndexLink from '@/components/common/IndexLink/IndexLink';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { translate } from '@/other/i18n';
import { TContentGroup } from '@/types/common';

/**/
type Props = {
  bookId: string;
  contents: Array<TContentGroup>;
};

/**
 *
 */
function Contents({ bookId, contents }: Props) {
  return (
    <>
      <h1 className="Contents__title">{translate(bookId, 'CONTENTS_PAGE.LINK_FULL_TITLE')}</h1>

      <ul className="IndexPage__list">
        <IndexLink
          href={getSongbookPagePath(bookId, SONGBOOK_PAGE.A_Z)}
          title={translate(bookId, 'A_Z_PAGE.LINK_FULL_TITLE')}
        />

        {/* Hide "(hidden)" items here only; they stay in contents data to keep prev/next navigation order. */}
        {contents.map((group: TContentGroup, index: number) => (
          <ContentGroup
            bookId={bookId}
            group={{ ...group, items: group.items.filter((item) => !item.title.includes('(hidden)')) }}
            key={index}
          />
        ))}

        <IndexLink
          href={getSongbookPagePath(bookId, SONGBOOK_PAGE.AUTHORS)}
          title={translate(bookId, 'AUTHORS_PAGE.LINK_FULL_TITLE')}
          withSeparator
        />
      </ul>
    </>
  );
}

/**/
export default Contents;
