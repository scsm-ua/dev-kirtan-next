'use client';
import classNames from 'classnames';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

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
const SCROLL_DURATION = 250;
const ROOT_CLASS = 'has-player-dock';
const IDLE: TPlayerSnapshot = { status: 'idle', position: 0, duration: null };

function getScrollParent(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p;
  }
  return document.documentElement;
}

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

  const titleRef = useRef<HTMLParagraphElement>(null);
  const marqueeRef = useRef<HTMLSpanElement>(null);
  const titleText = controller?.title;
  const subtitleText = controller?.subtitle;

  // Expose how far the title overflows so CSS can scroll it (mobile layout only).
  useEffect(() => {
    const box = titleRef.current;
    const inner = marqueeRef.current;
    if (!box || !inner) return;
    const measure = () => {
      const distance = Math.ceil(inner.scrollWidth - box.clientWidth);
      if (distance > 1) {
        box.style.setProperty('--marquee-distance', `${distance}px`);
        // ~25px/s plus pauses at both ends
        box.style.setProperty('--marquee-duration', `${distance / 25 + 4}s`);
        box.classList.add('PlayerDock__title--scroll');
      } else {
        box.classList.remove('PlayerDock__title--scroll');
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [titleText, subtitleText, visible]);

  const scrollToInline = () => {
    const el = controller?.element;
    if (!el) return;
    // The page scrolls inside .Layout__content, not the window.
    const scroller = getScrollParent(el);
    const box = scroller.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const from = scroller.scrollTop;
    const maxY = scroller.scrollHeight - scroller.clientHeight;
    const to = Math.max(
      0,
      Math.min(maxY, from + rect.top - box.top + rect.height / 2 - scroller.clientHeight / 2)
    );
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scroller.scrollTop = to;
      return;
    }
    // Native smooth scroll duration can't be tuned, so animate manually.
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / SCROLL_DURATION);
      scroller.scrollTop = from + (to - from) * (1 - (1 - t) ** 3);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

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
                <p
                  className="PlayerDock__title"
                  onClick={scrollToInline}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      scrollToInline();
                    }
                  }}
                  ref={titleRef}
                  role="button"
                  tabIndex={0}
                  title="Show in list"
                >
                  <span className="PlayerDock__marquee" ref={marqueeRef}>
                    {controller.title && (
                      <span className="PlayerDock__name">{controller.title}</span>
                    )}
                    {controller.title && controller.subtitle && (
                      <span className="PlayerDock__sep"> · </span>
                    )}
                    {controller.subtitle && (
                      <span className="PlayerDock__subtitle">{controller.subtitle}</span>
                    )}
                  </span>
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
