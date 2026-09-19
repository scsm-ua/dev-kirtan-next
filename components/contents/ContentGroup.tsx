import './ContentGroup.scss';
import ContentItem from '@/components/contents/ContentItem';
import GroupTitle from '@/components/contents/GroupTitle';

import { TContentGroup, TContentItem } from '@/types/common';

/**/
type Props = {
  bookId: string;
  group: TContentGroup;
};

/**
 *
 */
function ContentGroup({ bookId, group }: Props) {
  const id = `section-${group.name}`;

  return (
    <li className="ContentGroup" id={id}>
      {group.name ? (
        <header className="ContentGroup__header">
          <h6 className="ContentGroup__title">
            <GroupTitle title={group.name} />
          </h6>
        </header>
      ) : (
        <header className="ContentGroup__header--empty" />
      )}

      <ul className="ContentGroup__list">
        {group.items.map((item: TContentItem, index: number) => (
          <ContentItem
            bookId={bookId}
            item={item}
            key={`${bookId}-${index}`}
          />
        ))}
      </ul>
    </li>
  );
}

/**/
export default ContentGroup;
