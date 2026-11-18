import { afterEach, describe, expect, it, vi } from 'vitest';

import { PREFERENCES } from '@/other/constants';
import {
  getAudioSort,
  getSongViewMode,
  getSongWbwMode,
  saveBookChoice,
  setAudioSort,
  setSongViewMode,
  setSongWbwMode
} from '@/other/userPreferrences';

describe('user preferences', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('remembers the chosen book', () => {
    saveBookChoice('ua');

    expect(localStorage.getItem(PREFERENCES.PREFERRED_BOOK_ID)).toBe('ua');
  });

  it('reports, without failing, when the book choice cannot be stored', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage is full');
    });

    expect(() => saveBookChoice('ua')).not.toThrow();
    expect(error).toHaveBeenCalledOnce();
  });

  it.each(['all', 'verse', 'translation'] as const)('remembers the song view mode "%s"', (mode) => {
    setSongViewMode(mode);

    expect(getSongViewMode()).toBe(mode);
  });

  it.each(['hide', 'inline', 'classical'] as const)('remembers the word-by-word mode "%s"', (mode) => {
    setSongWbwMode(mode);

    expect(getSongWbwMode()).toBe(mode);
  });

  it.each(['firstLine', 'title', 'shuffle'] as const)('remembers the audio sort "%s"', (sort) => {
    setAudioSort(sort);

    expect(getAudioSort()).toBe(sort);
  });

  it('starts with everything shown, no word-by-word and audio sorted by the first line', () => {
    expect(getSongViewMode()).toBe('all');
    expect(getSongWbwMode()).toBe('hide');
    expect(getAudioSort()).toBe('firstLine');
  });

  it('falls back to the defaults for values it does not know', () => {
    setSongViewMode('unknown' as never);
    setSongWbwMode('unknown' as never);
    setAudioSort('unknown' as never);

    expect(getSongViewMode()).toBe('all');
    expect(getSongWbwMode()).toBe('hide');
    expect(getAudioSort()).toBe('firstLine');
  });

  it('keeps the audio sort for the browser session only', () => {
    setAudioSort('title');

    expect(JSON.stringify(sessionStorage)).toContain('title');
    expect(JSON.stringify(localStorage)).not.toContain('title');
  });

});
