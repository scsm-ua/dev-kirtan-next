'use client';
import { RefObject, useEffect, useState, useSyncExternalStore } from 'react';

import { PlayerController } from '@/other/player/PlayerController';
import { playerManager } from '@/other/player/PlayerManager';
import type { TPlayerSnapshot, TPlayerSource } from '@/types/player';

/**/
const noopSubscribe = () => () => {};
const getIdle = (): TPlayerSnapshot | null => null;

/**/
export function useControllerSnapshot(controller: PlayerController | null): TPlayerSnapshot | null {
  return useSyncExternalStore(
    controller ? controller.subscribe : noopSubscribe,
    controller ? controller.getSnapshot : getIdle,
    controller ? controller.getSnapshot : getIdle
  );
}

/** The controller is bound to the initial source; re-key the widget to change it. */
export function usePlayer(
  source: TPlayerSource,
  title: string | undefined,
  ref: RefObject<HTMLElement | null>,
  subtitle?: string
) {
  const [controller] = useState(() => new PlayerController(source, title, subtitle));
  const snapshot = useControllerSnapshot(controller);
  const isActive = useSyncExternalStore(
    playerManager.subscribe,
    () => playerManager.getSnapshot().active === controller,
    () => false
  );

  useEffect(() => {
    controller.setElement(ref.current);
    playerManager.register(controller);

    return () => {
      playerManager.unregister(controller);
      controller.destroy();
      controller.setElement(null);
    };
  }, [controller, ref]);

  return { controller, snapshot, isActive };
}
