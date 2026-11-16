import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HotkeyHint from '@/components/common/GlobalHotkeys/HotkeyHint';

const KEY = 'kirtan:hotkeys-hint-ts';
const WEEK = 7 * 24 * 3600 * 1000;
const NOW = new Date('2026-11-15T12:00:00Z').getTime();

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const hint = () => screen.queryByRole('button', { name: /hotkeys/ });

describe('HotkeyHint', () => {
  it('appears on a first visit and remembers when', () => {
    render(<HotkeyHint />);

    expect(hint().querySelector('kbd').textContent).toBe('h');
    expect(localStorage.getItem(KEY)).toBe(String(NOW));
  });

  it('fades out after 9.5 s and is gone after 10 s', () => {
    render(<HotkeyHint />);

    act(() => vi.advanceTimersByTime(9499));
    expect(hint().classList.contains('HotkeyHint--fading')).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(hint().classList.contains('HotkeyHint--fading')).toBe(true);
    act(() => vi.advanceTimersByTime(500));
    expect(hint()).toBeNull();
  });

  it('does not appear again within a week', () => {
    localStorage.setItem(KEY, String(NOW - WEEK + 1000));
    render(<HotkeyHint />);

    expect(hint()).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(String(NOW - WEEK + 1000));
  });

  it('appears again after a week', () => {
    localStorage.setItem(KEY, String(NOW - WEEK));
    render(<HotkeyHint />);

    expect(hint()).toBeTruthy();
  });

  it('never appears on a phone', () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
    render(<HotkeyHint />);

    expect(hint()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('opens the hotkeys help on a click and goes away', () => {
    const onShowHelp = vi.fn();
    window.addEventListener('kirtan:showHelp', onShowHelp);
    render(<HotkeyHint />);
    fireEvent.click(hint());
    window.removeEventListener('kirtan:showHelp', onShowHelp);

    expect(onShowHelp).toHaveBeenCalledOnce();
    expect(hint()).toBeNull();
  });
});
