import '@/styles/index-page.scss';

import ContentGroup from '@/components/contents/ContentGroup';
import UnknownAuthors from '@/components/authors/UnknownAuthors';
import { TContentGroup } from '@/types/common';

/**/
type Props = {
  bookId: string;
  contents: Array<TContentGroup>;
  unknown?: TContentGroup;
};

/**
 *
 */
function Authors({ bookId, contents, unknown }: Props) {
  return (
    <ul className="IndexPage__list">
      {contents.map((group: TContentGroup) => (
        <ContentGroup bookId={bookId} group={group} key={group.name} />
      ))}
      {unknown && (
        <UnknownAuthors>
          <ContentGroup bookId={bookId} group={unknown} />
        </UnknownAuthors>
      )}
    </ul>
  );
}

/**/
export default Authors;
