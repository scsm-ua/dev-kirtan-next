'use client';
import classNames from 'classnames';
import type { MouseEvent } from 'react';

import './PlayToggle.scss';
import { PauseIcon, PlayIcon } from '@/components/player/icons';
import type { TPlayerStatus } from '@/types/player';

type Props = {
  className?: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  status: TPlayerStatus;
};

/**/
function PlayToggle({ className, onClick, status }: Props) {
  const busy = status === 'playing' || status === 'loading';

  const cls = classNames('PlayToggle', className, {
    'PlayToggle--playing': status === 'playing',
    'PlayToggle--loading': status === 'loading',
    'PlayToggle--error': status === 'error'
  });

  return (
    <button
      aria-label={busy ? 'Pause' : 'Play'}
      className={cls}
      onClick={onClick}
      title={status === 'error' ? 'Playback error, try again' : undefined}
      type="button"
    >
      {busy ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
}

/**/
export default PlayToggle;
