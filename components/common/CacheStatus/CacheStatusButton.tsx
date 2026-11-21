'use client';
import { useState } from 'react';

import './CacheStatusButton.scss';
import CacheLed from './CacheLed';
import CacheStatusModal, { getStateText } from './CacheStatusModal';
import { useBookCacheState } from '@/other/hooks/useCacheStatus';

/**
 * Header button with the offline dot of the current songbook; opens the
 * popup with the details. Not rendered without a service worker.
 */
function CacheStatusButton({ bookId }: { bookId: string }) {
  const [isOpen, setOpen] = useState(false);
  const state = useBookCacheState(bookId);
  if (state === 'unavailable') return null;

  return (
    <>
      <button
        aria-label={getStateText(bookId, state)}
        className="CacheStatusButton"
        data-book={bookId}
        onClick={() => setOpen(true)}
        type="button"
      >
        <CacheLed state={state} />
      </button>

      <CacheStatusModal bookId={bookId} isOpen={isOpen} onClose={() => setOpen(false)} />
    </>
  );
}

/**/
export default CacheStatusButton;
