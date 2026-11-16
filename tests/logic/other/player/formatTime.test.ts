import { describe, expect, it } from 'vitest';

import { formatTime } from '@/other/player/formatTime';

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [59.9, '0:59'],
    [65, '1:05'],
    [600, '10:00'],
    [3600, '1:00:00'],
    [3725, '1:02:05']
  ])('%s s → %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });

  it.each([null, NaN, Infinity, -1])('shows a placeholder for %s', (seconds) => {
    expect(formatTime(seconds)).toBe('--:--');
  });
});
