import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PlayToggle from '@/components/player/PlayToggle';

import type { TPlayerStatus } from '@/types/player';

describe('PlayToggle', () => {
  it.each<[TPlayerStatus, string, string[], string | null]>([
    ['idle', 'Play', [], null],
    ['paused', 'Play', [], null],
    ['ended', 'Play', [], null],
    ['loading', 'Pause', ['PlayToggle--loading'], null],
    ['playing', 'Pause', ['PlayToggle--playing'], null],
    ['error', 'Play', ['PlayToggle--error'], 'Playback error, try again']
  ])('%s: a "%s" button with %j', (status, name, modifiers, title) => {
    render(<PlayToggle className="Extra" onClick={() => {}} status={status} />);
    const button = screen.getByRole('button', { name });

    expect([...button.classList]).toEqual(['PlayToggle', 'Extra', ...modifiers]);
    expect(button.getAttribute('title')).toBe(title);
    expect(button.getAttribute('type')).toBe('button');
  });

  it('calls back on a click', () => {
    const onClick = vi.fn();
    render(<PlayToggle onClick={onClick} status="idle" />);
    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does nothing when disabled', () => {
    const onClick = vi.fn();
    render(<PlayToggle disabled onClick={onClick} status="idle" />);
    fireEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });
});
