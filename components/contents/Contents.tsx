import './Contents.scss';
import '@/styles/index-page.scss';

import ContentGroup from '@/components/contents/ContentGroup';
import IndexLink from '@/components/common/IndexLink/IndexLink';
import { PATH } from '@/other/constants';
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
          href={'/' + bookId + PATH.PAGE.A_Z}
          title={translate(bookId, 'A_Z_PAGE.LINK_FULL_TITLE')}
        />

        {contents.map((group: TContentGroup, index: number) => (
          <ContentGroup bookId={bookId} group={group} key={index} />
        ))}

        <IndexLink
          href={'/' + bookId + PATH.PAGE.AUTHORS}
          title={translate(bookId, 'AUTHORS_PAGE.LINK_FULL_TITLE')}
          withSeparator
        />
      </ul>
    </>
  );
}

/**/
export default Contents;
