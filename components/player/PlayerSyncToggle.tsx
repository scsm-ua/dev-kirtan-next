'use client';
import classNames from 'classnames';
import { useSyncExternalStore } from 'react';

import PlayToggle from '@/components/player/PlayToggle';
import { playerManager } from '@/other/player/PlayerManager';
import { useControllerSnapshot } from '@/other/player/usePlayer';

type Props = {
  className?: string;
};

const getServerActive = () => null;

/** Play/pause bound to the active track while the page shows it (own or mirrored); starts the first page track when none is active. */
function PlayerSyncToggle({ className }: Props) {
  const active = useSyncExternalStore(
    playerManager.subscribe,
    playerManager.getActiveOnPage,
    getServerActive
  );
  const snapshot = useControllerSnapshot(active);

  return (
    <PlayToggle
      className={classNames('PlayerSyncToggle', className)}
      onClick={() => (active ? active.toggle() : playerManager.playFirst())}
      status={snapshot?.status ?? 'idle'}
    />
  );
}

/**/
export default PlayerSyncToggle;
