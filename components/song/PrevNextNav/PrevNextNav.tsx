'use client';

import './PrevNextNav.scss';
import PrevNextLink from '@/components/song/PrevNextNav/PrevNextLink';
import { SwipeNav } from '@/components/song/PrevNextNav/SwipeNav';
import { usePageQuery } from '@/other/hooks/usePageQuery';

import type { TNavItem, TNavItems, TNavItemsMap } from '@/types/song';

/**/
type Props = {
  navMap: TNavItemsMap;
};

/**
 *
 */
function PrevNextNav({ navMap }: Props) {
  const pageQuery = usePageQuery();

  const prevNext: TNavItems =
    (typeof pageQuery === 'string' && (navMap[pageQuery] || Object.values(navMap)[0])) ||
    {} as any;

  if (typeof pageQuery !== 'string') return null;

  return (
    <nav aria-label="Previous / next song" className="PrevNextNav">
      <div className="PrevNextNav__container">
        <div className="PrevNextNav__content">
          <PrevNextLink dir="prev" item={prevNext.prev as TNavItem} />
          <PrevNextLink dir="next" item={prevNext.next as TNavItem} />
        </div>
      </div>

      <SwipeNav prevNext={prevNext} />
    </nav>
  );
}

/**/
export default PrevNextNav;
