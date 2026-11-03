import { PREFERENCES } from '@/other/constants';
import { DEFAULT_WBW_MODE, VIEW_MODE, WBW_MODE } from '@/types/common';
import type { TViewMode, TWbwMode } from '@/types/common';

/**
 * Preserve user choice of the Book ID in the Local storage.
 */
export function saveBookChoice(bookId: string): void {
  try {
    localStorage.setItem(PREFERENCES.PREFERRED_BOOK_ID, bookId);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Preserve user choice of show/hide song verses/translation.
 * Stored as semantic strings: 'all' | 'verse' | 'translation'.
 */
const SONG_VIEW_MODE = 'SONG_VIEW_MODE';

/**/
const SONG_WBW_MODE = 'SONG_WBW_MODE';

/**/
const SHOW_HIDDEN_BOOKS = 'SHOW_HIDDEN_BOOKS';

/**/
export function getSongViewMode(): TViewMode {
  const val = localStorage.getItem(SONG_VIEW_MODE);
  if (val === VIEW_MODE.ALL || val === VIEW_MODE.VERSE || val === VIEW_MODE.TRANSLATION) {
    return val;
  }
  return VIEW_MODE.ALL;
}

/**/
export function setSongViewMode(value: TViewMode) {
  localStorage.setItem(SONG_VIEW_MODE, value);
}

/**/
export function getSongWbwMode(): TWbwMode {
  const val = localStorage.getItem(SONG_WBW_MODE);
  if (val === WBW_MODE.HIDE || val === WBW_MODE.INLINE || val === WBW_MODE.CLASSICAL) {
    return val;
  }
  return DEFAULT_WBW_MODE;
}

/**/
export function setSongWbwMode(value: TWbwMode) {
  localStorage.setItem(SONG_WBW_MODE, value);
}

/**/
export function shouldShowHiddenBooks(): boolean {
  return !!localStorage.getItem(SHOW_HIDDEN_BOOKS);
}
