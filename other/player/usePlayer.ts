'use client';
import { RefObject, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { PagePathContext } from '@/other/router/pagePath';
import { PlayerController } from '@/other/player/PlayerController';
import { playerManager } from '@/other/player/PlayerManager';
import type { TPlayerSnapshot, TPlayerSource, TPlayerTrackInfo } from '@/types/player';

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
  subtitle?: string,
  trackInfo?: TPlayerTrackInfo,
  autoAdvance = true
) {
  const originPath = useContext(PagePathContext) ?? '';
  // A player kept alive after its page was left is picked up again when the page returns.
  const [controller] = useState(() => {
    const key = `${originPath}|${source.url}`;
    return playerManager.acquire(
      key,
      () => new PlayerController(source, title, subtitle, trackInfo, { autoAdvance, key, originPath })
    );
  });
  const snapshot = useControllerSnapshot(controller);
  const isActive = useSyncExternalStore(
    playerManager.subscribe,
    () => playerManager.getSnapshot().active === controller,
    () => false
  );

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    controller.setElement(ref.current);
    playerManager.register(controller);

    return () => {
      mounted.current = false;
      // Dev StrictMode re-runs effects of reordered list items: skip teardown if set up again.
      queueMicrotask(() => {
        if (mounted.current) return;
        controller.setElement(null);
        // The active page's players outlive their widgets (see PlayerManager).
        if (!playerManager.unregister(controller)) controller.destroy();
      });
    };
  }, [controller, ref]);

  useEffect(() => {
    controller.setTitle(title, subtitle);
  }, [controller, title, subtitle]);

  return { controller, snapshot, isActive };
}
