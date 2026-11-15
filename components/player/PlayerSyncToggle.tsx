'use client';
import classNames from 'classnames';
import { useSyncExternalStore } from 'react';

import PlayToggle from '@/components/player/PlayToggle';
import { playerManager } from '@/other/player/PlayerManager';
import { useControllerSnapshot } from '@/other/player/usePlayer';

type Props = {
  className?: string;
};

/** The active player only while its widget is on the shown page. */
const getActive = () => {
  const { active } = playerManager.getSnapshot();
  return active?.element?.isConnected ? active : null;
};
const getServerActive = () => null;

/** Play/pause bound to the page's active track; starts the first page track when none is active. */
function PlayerSyncToggle({ className }: Props) {
  const active = useSyncExternalStore(playerManager.subscribe, getActive, getServerActive);
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
