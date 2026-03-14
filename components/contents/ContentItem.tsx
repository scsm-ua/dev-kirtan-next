import classnames from 'classnames';

import './ContentItem.scss';
import type { TContentItem } from '@/types/common';

/**/
type Props = {
  bookId: string;
  item: TContentItem;
};

/**
 *
 */
function ContentItem({ bookId, item }: Props) {
  const { aliasName, has, id, page, pages, title } = item;
  const cls = (classnames as any)(
    'ContentItem__title',
    has.translation || 'ContentItem__title--normal'
  );

  const _pages = Array.isArray(page) ? page.join(', ') : page;
  let href = '/' + bookId + '/' + id;

  if (pages?.length > 1) {
    href += `?p=${page}`;
  }

  return (
    <li className="ContentItem">
      <a href={href} className="ContentItem__link">
        <div className="ContentItem__box">
          <h6 className={cls} title={aliasName}>
            {title}
          </h6>

          <div className="ContentItem__info">
            {has.audio && (
              <span className="ContentItem__embed" title="Audio">♪</span>
            )}
            {_pages && (
              <span className="ContentItem__page" title="Page in paper songbook">{_pages}</span>
            )}
          </div>
        </div>

        <div className="ContentItem__suffix">
          <div className="ContentItem__icon icon-chevron-right" />
        </div>
      </a>
    </li>
  );
}

/**/
export default ContentItem;
