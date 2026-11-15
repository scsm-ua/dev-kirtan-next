import { useSyncExternalStore } from 'react';

import { getIsOnline, subscribeConnectivity } from '@/other/connectivity';

/**/
const getServerSnapshot = () => true;

/**
 * Connectivity flag shared by all components. Assumes online on the server
 * and during hydration.
 */
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribeConnectivity, getIsOnline, getServerSnapshot);
}
