'use client';
// import SwipeListener from 'swipe-listener';
import { useEffect } from 'react';
import VanillaSwipe, { type EventData } from 'vanilla-swipe';

import type { TNavItems } from '@/types/song';

/**/
type Props = { prevNext: TNavItems };

/**
 *
 */
export function SwipeNav({ prevNext }: Props) {
  let listener;

  const goAway = ({ detail }: CustomEvent, data: EventData) => {
    // if (detail['directions'].left && prevNext.next) {
    if (data.directionX === 'LEFT' && prevNext.next) {
      window.location.href = prevNext.next.path;
    }

    // if (detail['directions'].right && prevNext.prev) {
    if (data.directionX === 'RIGHT' && prevNext.prev) {
      window.location.href = prevNext.prev.path;
    }
  };

  useEffect(() => {
    const el = document.getElementById('body');
    // listener = SwipeListener(el);
    // el.addEventListener('swipe', goAway);
    listener = new VanillaSwipe({
      element: el,
      // onSwiping: handler,
      onSwiped: goAway,
      mouseTrackingEnabled: true,
    });

    listener.init();

    return () => {
      // listener?.off();
      listener?.destroy();
      // el.removeEventListener('swipe', goAway);
    };
  }, [prevNext]);

  return null;
}
