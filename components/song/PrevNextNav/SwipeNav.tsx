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
  let listener;

  const goAway = ({ detail }: CustomEvent) => {
    if (detail['directions'].left && prevNext.next) {
      window.location.href = prevNext.next.path;
    }

    if (detail['directions'].right && prevNext.prev) {
      window.location.href = prevNext.prev.path;
    }
  };

  useEffect(() => {
    const el = document.getElementById('body');
    listener = SwipeListener(el);
    el.addEventListener('swipe', goAway);

    return () => {
      listener?.off();
      el.removeEventListener('swipe', goAway);
    };
  }, [prevNext]);

  return null;
}
