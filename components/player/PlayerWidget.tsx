'use client';
import classNames from 'classnames';
import { useRef } from 'react';

import './PlayerWidget.scss';
import PlayToggle from '@/components/player/PlayToggle';
import SeekBar from '@/components/player/SeekBar';
import { usePlayer } from '@/other/player/usePlayer';
import type { TPlayerSource } from '@/types/player';

type Props = {
  source: TPlayerSource;
  title?: string;
  /** Shown only in the dock, after the title (e.g. the song title). */
  subtitle?: string;
  className?: string;
};

/**/
function PlayerWidget({ source, title, subtitle, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { controller, snapshot, isActive } = usePlayer(source, title, ref, subtitle);
  const { status, position, duration } = snapshot;
  const cls = classNames(
    'PlayerWidget',
    `PlayerWidget--${status}`,
    isActive && 'PlayerWidget--active',
    className
  );

  return (
    // Row click is a mouse/touch shortcut; the PlayToggle button stays the keyboard target.
    <div className={cls} onClick={controller.toggle} ref={ref}>
      <PlayToggle
        onClick={(e) => {
          e.stopPropagation();
          controller.toggle();
        }}
        status={status}
      />

      {title && <p className="PlayerWidget__title">{title}</p>}

      {isActive && (
        <SeekBar
          duration={duration}
          label={title || 'Progress'}
          loading={status === 'loading'}
          position={position}
          readOnly
        />
      )}
    </div>
  );
}

/**/
export default PlayerWidget;
