import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import SeekBar from '@/components/player/SeekBar';
import { formatTime } from '@/other/player/formatTime';

// jsdom has no pointer capture.
const { setPointerCapture } = Element.prototype;
beforeAll(() => {
  Element.prototype.setPointerCapture = vi.fn();
});
afterAll(() => {
  Element.prototype.setPointerCapture = setPointerCapture;
});

const DURATION = 200;
const TRACK = { left: 100, width: 400 };

function renderSlider(position: number, duration: number | null = DURATION) {
  const onSeek = vi.fn();
  render(<SeekBar duration={duration} label="Song" onSeek={onSeek} position={position} />);
  const slider = screen.getByRole('slider', { name: 'Song' });
  const track = slider.querySelector('.SeekBar__track');
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ ...TRACK, top: 0, height: 4 } as DOMRect);

  return { onSeek, slider };
}

/** The x coordinate of a point of the track, 0…1 from the left edge. */
const x = (ratio: number) => TRACK.left + ratio * TRACK.width;
const fill = () => (document.querySelector('.SeekBar__fill') as HTMLElement).style.width;

describe('SeekBar', () => {
  describe('read only (inline widget)', () => {
    it('is a progress bar of the position', () => {
      render(<SeekBar duration={DURATION} label="Song" position={50} readOnly />);
      const bar = screen.getByRole('progressbar', { name: 'Song' });

      expect(bar.getAttribute('aria-valuenow')).toBe('50');
      expect(bar.getAttribute('aria-valuemax')).toBe(String(DURATION));
      expect(fill()).toBe('25%');
      expect(screen.queryByRole('slider')).toBeNull();
    });
  });

  describe('as a slider', () => {
    it('tells the position and time, and can be focused', () => {
      const { slider } = renderSlider(50);

      expect(slider.getAttribute('aria-valuenow')).toBe('50');
      expect(slider.getAttribute('aria-valuemin')).toBe('0');
      expect(slider.getAttribute('aria-valuemax')).toBe(String(DURATION));
      expect(slider.getAttribute('aria-valuetext')).toBe(`${formatTime(50)} / ${formatTime(DURATION)}`);
      expect(slider.getAttribute('aria-disabled')).toBe('false');
      expect(slider.tabIndex).toBe(0);
      expect(fill()).toBe('25%');
    });

    it('never fills past the ends', () => {
      renderSlider(DURATION * 2);
      expect(fill()).toBe('100%');
    });

    it.each([
      ['ArrowRight', 105],
      ['ArrowUp', 105],
      ['ArrowLeft', 95],
      ['ArrowDown', 95],
      ['PageUp', 130],
      ['PageDown', 70],
      ['Home', 0],
      ['End', DURATION]
    ])('%s seeks to %s s', (key, seconds) => {
      const { onSeek, slider } = renderSlider(100);
      fireEvent.keyDown(slider, { key });

      expect(onSeek).toHaveBeenCalledExactlyOnceWith(seconds);
    });

    it.each([
      [2, 'ArrowLeft', 0],
      [DURATION - 2, 'ArrowRight', DURATION],
      [10, 'PageDown', 0]
    ])('from %s s, %s stops at %s s', (position, key, seconds) => {
      const { onSeek, slider } = renderSlider(position);
      fireEvent.keyDown(slider, { key });

      expect(onSeek).toHaveBeenCalledExactlyOnceWith(seconds);
    });

    it('leaves other keys alone', () => {
      const { onSeek, slider } = renderSlider(100);
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' });
      slider.dispatchEvent(event);

      expect(onSeek).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('drags: follows the pointer, shows the time, seeks once on release', () => {
      const { onSeek, slider } = renderSlider(0);

      fireEvent.pointerDown(slider, { button: 0, clientX: x(0.25), pointerId: 1, pointerType: 'mouse' });
      fireEvent.pointerMove(slider, { clientX: x(0.5), pointerId: 1, pointerType: 'mouse' });

      expect(fill()).toBe('50%');
      expect(slider.classList.contains('SeekBar--dragging')).toBe(true);
      expect(document.querySelector('.SeekBar__tip').textContent).toBe(formatTime(DURATION / 2));
      expect(onSeek).not.toHaveBeenCalled();

      fireEvent.pointerUp(slider, { clientX: x(0.75), pointerId: 1, pointerType: 'mouse' });

      expect(onSeek).toHaveBeenCalledExactlyOnceWith(DURATION * 0.75);
      expect(slider.classList.contains('SeekBar--dragging')).toBe(false);
    });

    it('clamps a drag past the edges', () => {
      const { onSeek, slider } = renderSlider(100);

      fireEvent.pointerDown(slider, { button: 0, clientX: x(0.5), pointerId: 1, pointerType: 'touch' });
      fireEvent.pointerUp(slider, { clientX: x(-1), pointerId: 1, pointerType: 'touch' });
      fireEvent.pointerDown(slider, { button: 0, clientX: x(0.5), pointerId: 1, pointerType: 'touch' });
      fireEvent.pointerUp(slider, { clientX: x(2), pointerId: 1, pointerType: 'touch' });

      expect(onSeek.mock.calls).toEqual([[0], [DURATION]]);
    });

    it('ignores the right mouse button', () => {
      const { onSeek, slider } = renderSlider(100);

      fireEvent.pointerDown(slider, { button: 2, clientX: x(0.5), pointerId: 1, pointerType: 'mouse' });
      fireEvent.pointerUp(slider, { clientX: x(0.5), pointerId: 1, pointerType: 'mouse' });

      expect(onSeek).not.toHaveBeenCalled();
    });

    it('shows the time under a hovering mouse, and hides it when the mouse leaves', () => {
      const { slider } = renderSlider(0);

      fireEvent.pointerMove(slider, { clientX: x(0.1), pointerType: 'mouse' });
      expect(document.querySelector('.SeekBar__tip').textContent).toBe(formatTime(DURATION * 0.1));

      fireEvent.pointerLeave(slider);
      expect(document.querySelector('.SeekBar__tip')).toBeNull();
    });

    it('cancels a drag when the pointer capture is lost', () => {
      const { onSeek, slider } = renderSlider(0);

      fireEvent.pointerDown(slider, { button: 0, clientX: x(0.5), pointerId: 1, pointerType: 'touch' });
      fireEvent(slider, new Event('lostpointercapture', { bubbles: true }));
      fireEvent.pointerUp(slider, { clientX: x(0.5), pointerId: 1, pointerType: 'touch' });

      expect(onSeek).not.toHaveBeenCalled();
      expect(fill()).toBe('0%');
    });
  });

  describe('before the duration is known', () => {
    it('is disabled and out of the tab order, and ignores keys and pointer', () => {
      const { onSeek, slider } = renderSlider(0, null);

      fireEvent.keyDown(slider, { key: 'End' });
      fireEvent.pointerDown(slider, { button: 0, clientX: x(0.5), pointerId: 1, pointerType: 'mouse' });
      fireEvent.pointerUp(slider, { clientX: x(0.5), pointerId: 1, pointerType: 'mouse' });

      expect(onSeek).not.toHaveBeenCalled();
      expect(slider.getAttribute('aria-disabled')).toBe('true');
      expect(slider.tabIndex).toBe(-1);
      expect(slider.hasAttribute('aria-valuetext')).toBe(false);
      expect(slider.classList.contains('SeekBar--disabled')).toBe(true);
    });

    it('shows "loading" only while loading', () => {
      render(<SeekBar duration={null} loading position={0} />);
      expect(screen.getByRole('slider').classList.contains('SeekBar--loading')).toBe(true);
    });
  });
});
