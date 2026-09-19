import './Contents.scss';
import '@/styles/index-page.scss';

import AuthorsLink from '@/components/common/AuthorsLink/AuthorsLink';
import ContentGroup from '@/components/contents/ContentGroup';
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
    <ul className="IndexPage__list">
      {contents.map((group: TContentGroup, index: number) => (
        <ContentGroup bookId={bookId} group={group} key={index} />
      ))}

      <AuthorsLink bookId={bookId} />
    </ul>
  );
}

/**/
export default Contents;
