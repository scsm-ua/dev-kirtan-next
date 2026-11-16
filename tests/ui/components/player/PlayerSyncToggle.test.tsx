import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import PlayerSyncToggle from '@/components/player/PlayerSyncToggle';
import { getFakeAdapter } from '@/tests/helpers/player';
import { closePlayerPage, renderPlayerPage, sourceSays } from '@/tests/helpers/playerPage';

afterEach(closePlayerPage);

const syncToggle = () => document.querySelector<HTMLButtonElement>('.PlayerSyncToggle');

describe('PlayerSyncToggle', () => {
  it('plays the first player of the page when none is active', () => {
    renderPlayerPage(['a', 'b'], { children: <PlayerSyncToggle className="Extra" /> });

    expect(syncToggle().getAttribute('aria-label')).toBe('Play');
    expect(syncToggle().classList.contains('Extra')).toBe(true);
    fireEvent.click(syncToggle());

    expect(getFakeAdapter('a').play).toHaveBeenCalledOnce();
    expect(getFakeAdapter('b')).toBeUndefined();
  });

  it('follows the active player and pauses it', () => {
    renderPlayerPage(['a', 'b'], { children: <PlayerSyncToggle /> });
    fireEvent.click(document.querySelector('.Test__b button'));
    sourceSays('b', (events) => events.onStatus('playing'));

    expect(syncToggle().getAttribute('aria-label')).toBe('Pause');
    fireEvent.click(syncToggle());

    expect(getFakeAdapter('b').pause).toHaveBeenCalledOnce();
    expect(getFakeAdapter('a')).toBeUndefined();
  });

  it('is idle when the active player is not on the shown page', () => {
    const { rerender } = renderPlayerPage(['a'], { children: <PlayerSyncToggle /> });
    fireEvent.click(document.querySelector('.Test__a button'));
    sourceSays('a', (events) => events.onStatus('playing'));
    // Another page: the player goes on without its widget.
    rerender(<PlayerSyncToggle />);

    expect(syncToggle().getAttribute('aria-label')).toBe('Play');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
