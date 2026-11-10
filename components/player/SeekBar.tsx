'use client';
import classNames from 'classnames';
import { KeyboardEvent, PointerEvent, useRef, useState } from 'react';

import './SeekBar.scss';
import { formatTime } from '@/other/player/formatTime';

type Props = {
  position: number;
  duration: number | null;
  loading?: boolean;
  label?: string;
  readOnly?: boolean;
  onSeek?: (seconds: number) => void;
};

const KEY_STEP = 5;
const PAGE_STEP = 30;

/**/
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Pointer-captured custom slider. Dragging past the left edge clamps to 0.
 */
function SeekBar({ position, duration, loading, label = 'Seek', readOnly, onSeek }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const enabled = duration != null && duration > 0;
  const ratio = drag ?? (enabled ? clamp(position / duration) : 0);
  const tip = drag ?? hover;

  const getRatio = (clientX: number): number => {
    const rect = trackRef.current.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(getRatio(e.clientX));
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    if (drag !== null) setDrag(getRatio(e.clientX));
    else if (e.pointerType === 'mouse') setHover(getRatio(e.clientX));
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    onSeek(getRatio(e.clientX) * duration);
    setDrag(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const steps: Record<string, number> = {
      ArrowLeft: position - KEY_STEP,
      ArrowDown: position - KEY_STEP,
      ArrowRight: position + KEY_STEP,
      ArrowUp: position + KEY_STEP,
      PageDown: position - PAGE_STEP,
      PageUp: position + PAGE_STEP,
      Home: 0,
      End: duration
    };
    if (!(e.key in steps)) return;
    e.preventDefault();
    onSeek(clamp(steps[e.key] / duration) * duration);
  };

  const cls = classNames('SeekBar', {
    'SeekBar--disabled': !enabled,
    'SeekBar--loading': loading && !enabled,
    'SeekBar--dragging': drag !== null,
    'SeekBar--readonly': readOnly
  });

  if (readOnly) {
    return (
      <div
        aria-label={label}
        aria-valuemax={enabled ? Math.round(duration) : 0}
        aria-valuemin={0}
        aria-valuenow={Math.round(ratio * (duration ?? 0))}
        className={cls}
        role="progressbar"
      >
        <div className="SeekBar__track">
          <div className="SeekBar__fill" style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div
      aria-disabled={!enabled}
      aria-label={label}
      aria-valuemax={enabled ? Math.round(duration) : 0}
      aria-valuemin={0}
      aria-valuenow={Math.round(ratio * (duration ?? 0))}
      aria-valuetext={enabled ? `${formatTime(ratio * duration)} / ${formatTime(duration)}` : undefined}
      className={cls}
      onKeyDown={handleKeyDown}
      onLostPointerCapture={() => setDrag(null)}
      onPointerDown={handlePointerDown}
      onPointerLeave={() => setHover(null)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="slider"
      tabIndex={enabled ? 0 : -1}
    >
      <div className="SeekBar__track" ref={trackRef}>
        <div className="SeekBar__fill" style={{ width: `${ratio * 100}%` }} />
        <div className="SeekBar__thumb" style={{ left: `${ratio * 100}%` }} />

        {enabled && tip !== null && (
          <div className="SeekBar__tip" style={{ left: `${tip * 100}%` }}>
            {formatTime(tip * duration)}
          </div>
        )}
      </div>
    </div>
  );
}

/**/
export default SeekBar;
