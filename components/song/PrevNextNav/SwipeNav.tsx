'use client';
import { useEffect } from 'react';
import VanillaSwipe, { type EventData } from 'vanilla-swipe';

import type { TNavItems } from '@/types/song';

/**/
type Props = { prevNext: TNavItems };

/**
 *
 */
export function SwipeNav({ prevNext }: Props) {
  useEffect(() => {
    const listener = new VanillaSwipe({
      element: getTargetEl(),
      onSwiped: (e, data: EventData) => handleSwipe(data, prevNext)
    });

    listener.init();

    return () => listener?.destroy()
  }, [prevNext]);

  return null;
}

/**
 *
 */
function getTargetEl(): HTMLElement {
  return document.getElementById('body');
}

/**
 *
 */
function handleSwipe(data: EventData, prevNext: TNavItems): void {
  // Skip if the modal window is being shown.
  if (getTargetEl().style.overflow === 'hidden') return;

  if (data.directionX === 'LEFT' && prevNext.next) {
    window.location.href = prevNext.next.path;
  }

  if (data.directionX === 'RIGHT' && prevNext.prev) {
    window.location.href = prevNext.prev.path;
  }
}
