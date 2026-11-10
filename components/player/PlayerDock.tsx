'use client';
import classNames from 'classnames';
import { useEffect, useState, useSyncExternalStore } from 'react';

import './PlayerDock.scss';
import PlayToggle from '@/components/player/PlayToggle';
import { PlayerAction } from '@/components/player/PlayerControls';
import SeekBar from '@/components/player/SeekBar';
import {
  CloseIcon,
  Forward5Icon,
  NextTrackIcon,
  PrevTrackIcon,
  Replay5Icon
} from '@/components/player/icons';
import { formatTime } from '@/other/player/formatTime';
import type { PlayerController } from '@/other/player/PlayerController';
import { playerManager, RESTART_THRESHOLD } from '@/other/player/PlayerManager';
import { useControllerSnapshot } from '@/other/player/usePlayer';
import type { TPlayerSnapshot } from '@/types/player';

const SKIP_STEP = 5;
const ROOT_CLASS = 'has-player-dock';
const IDLE: TPlayerSnapshot = { status: 'idle', position: 0, duration: null };

/**/
type Props = {
  autoAdvance?: boolean;
};

/**
 * Mount once per page: fixed bottom bar for the active player, closable only via X.
 */
function PlayerDock({ autoAdvance = true }: Props) {
  const { active, hasPrev, hasNext } = useSyncExternalStore(
    playerManager.subscribe,
    playerManager.getSnapshot,
    playerManager.getSnapshot
  );
  // Keep rendering the last player while the dock slides out.
  const [last, setLast] = useState<PlayerController | null>(null);
  if (active && active !== last) setLast(active);

  const visible = !!active;
  const controller = active ?? last;
  const snapshot = useControllerSnapshot(controller);

  useEffect(() => {
    playerManager.autoAdvance = autoAdvance;
    return () => {
      playerManager.autoAdvance = true;
    };
  }, [autoAdvance]);

  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.classList.add(ROOT_CLASS);
    return () => root.classList.remove(ROOT_CLASS);
  }, [visible]);

  const { status, position, duration } = snapshot ?? IDLE;
  const canSkip = duration != null && duration > 0;

  return (
    <div
      aria-hidden={!visible}
      aria-label="Now playing"
      className={classNames('PlayerDock', visible && 'PlayerDock--visible')}
      inert={!visible}
      role="region"
    >
      {controller && snapshot && (
        <div className="PlayerDock__inner">
          <div className="PlayerDock__main">
            <div className="PlayerDock__buttons">
              {(controller.title || controller.subtitle) && (
                <p className="PlayerDock__title">
                  {controller.title}
                  {controller.title && controller.subtitle && ' · '}
                  {controller.subtitle && (
                    <span className="PlayerDock__subtitle">{controller.subtitle}</span>
                  )}
                </p>
              )}

              <PlayerAction className="PlayerDock__btn PlayerDock__action" controller={controller} />
              <div className="PlayerDock__transport">
                <button
                  aria-label="Previous track"
                  className="PlayerDock__btn"
                  disabled={!hasPrev && position <= RESTART_THRESHOLD}
                  onClick={playerManager.playPrev}
                  title="Previous track"
                  type="button"
                >
                  <PrevTrackIcon />
                </button>
                <button
                  aria-label={`Back ${SKIP_STEP} seconds`}
                  className="PlayerDock__btn"
                  disabled={!canSkip}
                  onClick={() => controller.seekBy(-SKIP_STEP)}
                  title={`-${SKIP_STEP}s`}
                  type="button"
                >
                  <Replay5Icon />
                </button>
                <PlayToggle onClick={controller.toggle} status={status} />
                <button
                  aria-label={`Forward ${SKIP_STEP} seconds`}
                  className="PlayerDock__btn"
                  disabled={!canSkip}
                  onClick={() => controller.seekBy(SKIP_STEP)}
                  title={`+${SKIP_STEP}s`}
                  type="button"
                >
                  <Forward5Icon />
                </button>
                <button
                  aria-label="Next track"
                  className="PlayerDock__btn"
                  disabled={!hasNext}
                  onClick={playerManager.playNext}
                  title="Next track"
                  type="button"
                >
                  <NextTrackIcon />
                </button>
              </div>

              <button
                aria-label="Close player"
                className="PlayerDock__close"
                onClick={playerManager.clearActive}
                title="Close player"
                type="button"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="PlayerDock__seek">
              <span className="PlayerDock__time">{formatTime(position)}</span>
              <SeekBar
                duration={duration}
                label={controller.title || 'Seek'}
                loading={status === 'loading'}
                onSeek={controller.seek}
                position={position}
              />
              <span className="PlayerDock__time">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**/
export default PlayerDock;
