import './AZ.scss';
import '@/styles/index-page.scss';

import ContentGroup from '@/components/contents/ContentGroup';
import IndexLink from '@/components/common/IndexLink/IndexLink';
import IndexExtraLinks from '@/components/common/IndexLink/IndexExtraLinks';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { translate } from '@/other/i18n';
import { TShortcut } from '@/types/book';
import { TContentGroup } from '@/types/common';

/**/
type Props = {
  bookId: string;
  contents: Array<TContentGroup>;
  hasAudio: boolean;
  shortcuts: Array<TShortcut>;
};

/**
 *
 */
function AZ({ bookId, contents, hasAudio, shortcuts }: Props) {
  const hasExtraLinks = hasAudio || shortcuts.length > 0;

  return (
    <ul className="IndexPage__list">
      <IndexLink
        compact={hasExtraLinks}
        href={getSongbookPagePath(bookId, SONGBOOK_PAGE.CONTENTS)}
        icon="aa"
        title={translate(bookId, 'CONTENTS_PAGE.LINK_FULL_TITLE')}
      />

      <IndexExtraLinks bookId={bookId} hasAudio={hasAudio} shortcuts={shortcuts} />

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
