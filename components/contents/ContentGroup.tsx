import './ContentGroup.scss';
import ContentItem from '@/components/contents/ContentItem';
import GroupTitle from '@/components/contents/GroupTitle';

import type { ReactNode } from 'react';
import { TContentItem } from '@/types/common';

/**/
type Props<T> = {
  bookId: string;
  group: { name?: string; items: Array<T> };
  renderItem?: (item: T, index: number) => ReactNode;
};

/**
 *
 */
function ContentGroup<T = TContentItem>({ bookId, group, renderItem }: Props<T>) {
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
        {group.items.map((item: T, index: number) =>
          renderItem ? (
            renderItem(item, index)
          ) : (
            <ContentItem
              bookId={bookId}
              item={item as TContentItem}
              key={`${bookId}-${index}`}
            />
          )
        )}
      </ul>
    </li>
  );
}

/**/
export default ContentGroup;
