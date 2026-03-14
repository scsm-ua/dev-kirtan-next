'use client';
import SwipeListener from 'swipe-listener';
import { useEffect } from 'react';

import type { TNavItems } from '@/types/song';

/**/
type Props = { prevNext: TNavItems };

/**
 *
 */
export function SwipeNav({ prevNext }: Props) {
  const goAway = ({ detail }: CustomEvent) => {
    // Skip if the modal window is being shown.
    if (document.body.style.overflow === 'hidden') return;

    if (detail['directions'].left && prevNext.next) {
      window.location.href = prevNext.next.path;
    }

    if (detail['directions'].right && prevNext.prev) {
      window.location.href = prevNext.prev.path;
    }
  };

  useEffect(() => {
    const listener = SwipeListener(document.body);
    document.body.addEventListener('swipe', goAway);

    return () => {
      listener?.off();
      document.body.removeEventListener('swipe', goAway);
    };
  }, [prevNext]);

  return null;
}
