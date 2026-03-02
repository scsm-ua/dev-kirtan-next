import { useEffect, useState } from 'react';
import { shouldShowHiddenBooks } from '@/other/userPreferrences';

/**
 *
 */
export function useHiddenBooks(isHidden: boolean) {
  const [isDisplayed, setDisplayed] = useState<boolean>(false);

  useEffect(() => {
    if (!isHidden || shouldShowHiddenBooks()) setDisplayed(true);
  }, []);

  return isDisplayed;
}
