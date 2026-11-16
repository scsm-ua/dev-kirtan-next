import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import PlayerWidget from '@/components/player/PlayerWidget';
import { playerManager } from '@/other/player/PlayerManager';
import { FAKE_TYPE, fakeUrl, getFakeAdapter } from '@/tests/helpers/player';
import { closePlayerPage, renderPlayerPage, sourceSays, trackTitle } from '@/tests/helpers/playerPage';

afterEach(closePlayerPage);

const widget = (name: string) => document.querySelector<HTMLElement>(`.Test__${name}`);
const toggleOf = (name: string) => widget(name).querySelector('button');

describe('PlayerWidget', () => {
  it('shows a play button and the title; nothing is loaded yet', () => {
    renderPlayerPage(['a']);

    expect(toggleOf('a').getAttribute('aria-label')).toBe('Play');
    expect(widget('a').querySelector('.PlayerWidget__title').textContent).toBe(trackTitle('a'));
    expect(widget('a').classList.contains('PlayerWidget--idle')).toBe(true);
    expect(widget('a').querySelector('[role="progressbar"]')).toBeNull();
    expect(getFakeAdapter('a')).toBeUndefined();
  });

  it('shows the subtitle in a second row only when asked to', () => {
    render(
      <>
        <PlayerWidget className="Test__a" source={{ type: FAKE_TYPE, url: fakeUrl('a') }} subtitle="Sub" title="T" />
        <PlayerWidget
          className="Test__b"
          showSubtitleInline
          source={{ type: FAKE_TYPE, url: fakeUrl('b') }}
          subtitle="Sub"
          title="T"
        />
      </>
    );

    expect(widget('a').querySelector('.PlayerWidget__subtitle')).toBeNull();
    expect(widget('b').querySelector('.PlayerWidget__subtitle').textContent).toBe('Sub');
    expect(widget('b').classList.contains('PlayerWidget--twoRows')).toBe(true);
  });

  it('plays on the button, becomes active with a progress bar, and pauses on the next press', () => {
    renderPlayerPage(['a']);
    fireEvent.click(toggleOf('a'));
    sourceSays('a', (events) => {
      events.onStatus('playing');
      events.onProgress(30, 120);
    });

    expect(getFakeAdapter('a').play).toHaveBeenCalledOnce();
    expect(widget('a').classList.contains('PlayerWidget--active')).toBe(true);
    expect(widget('a').classList.contains('PlayerWidget--playing')).toBe(true);
    expect(toggleOf('a').getAttribute('aria-label')).toBe('Pause');
    expect(screen.getByRole('progressbar', { name: trackTitle('a') }).getAttribute('aria-valuenow')).toBe('30');

    fireEvent.click(toggleOf('a'));
    expect(getFakeAdapter('a').pause).toHaveBeenCalledOnce();
  });

  it('a click anywhere on the row plays too, once', () => {
    renderPlayerPage(['a']);
    fireEvent.click(widget('a'));

    expect(getFakeAdapter('a').play).toHaveBeenCalledOnce();
  });

  it('the button press is not counted twice by the row', () => {
    renderPlayerPage(['a']);
    fireEvent.click(toggleOf('a'));
    sourceSays('a', (events) => events.onStatus('playing'));

    expect(getFakeAdapter('a').play).toHaveBeenCalledOnce();
    expect(getFakeAdapter('a').pause).not.toHaveBeenCalled();
  });

  it('only one plays at a time', () => {
    renderPlayerPage(['a', 'b']);
    fireEvent.click(toggleOf('a'));
    sourceSays('a', (events) => events.onStatus('playing'));
    fireEvent.click(toggleOf('b'));

    expect(getFakeAdapter('a').pause).toHaveBeenCalledOnce();
    expect(widget('a').classList.contains('PlayerWidget--active')).toBe(false);
    expect(widget('b').classList.contains('PlayerWidget--active')).toBe(true);
  });

  it('is registered in page order, so the manager can play the first one', () => {
    renderPlayerPage(['a', 'b']);
    fireEvent.click(toggleOf('b'));

    expect(playerManager.getSnapshot()).toMatchObject({ hasPrev: true, hasNext: false });
  });

  it('when disabled, neither the button nor the row plays', () => {
    render(
      <PlayerWidget className="Test__a" disabled source={{ type: FAKE_TYPE, url: fakeUrl('a') }} title="T" />
    );
    fireEvent.click(toggleOf('a'));
    fireEvent.click(widget('a'));

    expect(getFakeAdapter('a')).toBeUndefined();
    expect(widget('a').classList.contains('PlayerWidget--disabled')).toBe(true);
  });

  it('shows a source error on the button', () => {
    renderPlayerPage(['a']);
    fireEvent.click(toggleOf('a'));
    sourceSays('a', (events) => events.onStatus('error'));

    expect(toggleOf('a').getAttribute('title')).toBe('Playback error, try again');
  });
});
