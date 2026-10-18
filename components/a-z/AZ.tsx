import './AZ.scss';
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
function AZ({ bookId, contents }: Props) {
  return (
    <ul className="IndexPage__list">
      <IndexLink
        href={getSongbookPagePath(bookId, SONGBOOK_PAGE.CONTENTS)}
        title={translate(bookId, 'CONTENTS_PAGE.LINK_FULL_TITLE')}
      />

      {contents.map((group: TContentGroup) => (
        <ContentGroup bookId={bookId} group={group} key={group.name} />
      ))}

      <IndexLink
        href={getSongbookPagePath(bookId, SONGBOOK_PAGE.AUTHORS)}
        title={translate(bookId, 'AUTHORS_PAGE.LINK_FULL_TITLE')}
        withSeparator
      />
    </ul>
  );
}

/**/
export default AZ;
