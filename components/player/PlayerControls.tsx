'use client';

import { DownloadIcon, ExternalLinkIcon } from '@/components/player/icons';
import type { PlayerController } from '@/other/player/PlayerController';

/** Download / external link button for the controller's source. */
export function PlayerAction({
  className,
  controller
}: {
  className: string;
  controller: PlayerController;
}) {
  const { action } = controller;
  if (!action) return null;

  return (
    <a
      aria-label={action.label}
      className={className}
      download={action.kind === 'download' ? '' : undefined}
      href={action.href}
      rel="noopener noreferrer"
      target="_blank"
      title={action.label}
    >
      {action.kind === 'download' ? <DownloadIcon /> : <ExternalLinkIcon />}
    </a>
  );
}
