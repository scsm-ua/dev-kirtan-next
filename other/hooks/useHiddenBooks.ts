import { useSyncExternalStore } from 'react';
import { shouldShowHiddenBooks } from '@/other/userPreferrences';

const subscribe = () => () => {};

/**
 *
 */
export function useHiddenBooks(isHidden: boolean) {
  return useSyncExternalStore(
    subscribe,
    () => !isHidden || shouldShowHiddenBooks(),
    () => !isHidden
  );
}
