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
  /** Also render the subtitle after the title in the row, in grey. */
  showSubtitleInline?: boolean;
  className?: string;
};

/**/
function PlayerWidget({ source, title, subtitle, showSubtitleInline, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { controller, snapshot, isActive } = usePlayer(source, title, ref, subtitle);
  const { status, position, duration } = snapshot;
  const hasTwoRows = Boolean(title && showSubtitleInline && subtitle);
  const cls = classNames(
    'PlayerWidget',
    `PlayerWidget--${status}`,
    isActive && 'PlayerWidget--active',
    hasTwoRows && 'PlayerWidget--twoRows',
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

      {hasTwoRows ? (
        <div className="PlayerWidget__text">
          <p className="PlayerWidget__title">{title}</p>
          <p className="PlayerWidget__subtitle">{subtitle}</p>
        </div>
      ) : (
        title && <p className="PlayerWidget__title">{title}</p>
      )}

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
