import classNames from 'classnames';

import './PrevNextLink.scss';
import type { TNavItem } from '@/types/song';

/**/
type Props = {
  dir: 'prev' | 'next';
  item?: TNavItem;
};

/**
 *
 */
function PrevNextLink({ dir, item }: Props) {
  const cls = classNames(
    'PrevNextLink',
    'PrevNextLink--' + dir,
    !item && 'PrevNextLink--disabled'
  );

  const iconCls = 'PrevNextLink__icon PrevNextLink__icon--' + dir;

  if (!item) {
    return (
      <span className={cls} data-disabled={true}>
        <span className={iconCls}>
          <span className="icon-chevron-right" />
        </span>
      </span>
    );
  }

  return (
    <a className={cls} href={item.path}>
      <span className={iconCls}>
        <span className="icon-chevron-right" />
      </span>

      {item.title && (
        <span className="PrevNextLink__label ellipsis">{item.title}</span>
      )}
    </a>
  );
}

/**/
export default PrevNextLink;
