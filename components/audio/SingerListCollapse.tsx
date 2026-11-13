'use client';

import classNames from 'classnames';
import { useState } from 'react';

import type { ReactNode } from 'react';

/**/
type Props = {
  children: ReactNode;
  count: number;
  label: string;
};

/**
 *
 */
function SingerListCollapse({ children, count, label }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={classNames('SingerList__collapse', isExpanded && 'SingerList__collapse--expanded')}>
      {children}
      <div className="SingerList__more">
        <button
          aria-expanded={isExpanded}
          className="SingerList__showAll"
          onClick={() => setIsExpanded(true)}
          type="button"
        >
          <span>{label}</span>
          <span className="SingerList__showAllCount">{count}</span>
          <i aria-hidden="true" className="icon-chevron-right SingerList__showAllIcon" />
        </button>
      </div>
    </div>
  );
}

/**/
export default SingerListCollapse;
