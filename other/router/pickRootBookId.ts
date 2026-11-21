import { getBookLocale } from '@/other/helpers';
import { PREFERENCES } from '@/other/constants';

/**
 * The root page `/` is the songbook list of the first songbook. On start the
 * app moves the reader to their own songbook, picked by the rules below.
 */

/** Path of the root page. */
export const ROOT_PATH = '/';

/**
 * Set on `<html>` before the first paint when the reader's book is not the
 * one in the HTML of `/`; CSS hides the content until the app has moved on.
 */
export const ROOT_PENDING_ATTR = 'data-root-pending';

/** The pending mark is dropped after this time even when the app did not start. */
const ROOT_PENDING_MAX_MS = 5000;

/**
 * Songbook to open on `/`:
 * 1) the one the reader chose before, if it still exists;
 * 2) the one in the language of the browser. Book ids are not always
 *    language codes (`ua` is `uk`), and variants (`en-pe`) are never picked;
 * 3) the first songbook.
 */
export function pickRootBookId(preferredBookId: string | null, bookIdList: Array<string>, language: string): string {
  if (preferredBookId && bookIdList.includes(preferredBookId)) return preferredBookId;

  return getBookIdByLanguage(bookIdList)[language.slice(0, 2).toLowerCase()] ?? bookIdList[0];
}

/** Language code → songbook, for the main songbooks (no variants such as `en-pe`). */
function getBookIdByLanguage(bookIdList: Array<string>): Record<string, string> {
  const mainBookIds = bookIdList.filter((bookId) => !bookId.includes('-'));
  const map: Record<string, string> = {};
  mainBookIds.forEach((bookId) => {
    map[getBookLocale(bookId)] ??= bookId;
  });
  // A book id that is itself the language code wins over a locale mapping.
  mainBookIds.forEach((bookId) => {
    map[bookId] = bookId;
  });

  return map;
}

/** The reader's choice and browser language, read in the browser. */
export function pickRootBookIdInBrowser(bookIdList: Array<string>): string {
  let preferredBookId: string | null = null;
  try {
    preferredBookId = localStorage.getItem(PREFERENCES.PREFERRED_BOOK_ID);
  } catch {
    // Storage is blocked: go by the language.
  }

  return pickRootBookId(
    preferredBookId,
    bookIdList,
    navigator.language || Intl.DateTimeFormat().resolvedOptions().locale
  );
}

/**
 * Inline script for the `<head>` of `/`: runs the same pick before the first
 * paint and marks `<html>` when the reader's book is not the first one, so
 * the wrong book never flashes. It cannot import anything, so it gets the
 * rules as data: the ids and the language map of `pickRootBookId`.
 */
export function getRootPendingScript(bookIdList: Array<string>): string {
  const data = JSON.stringify({
    attr: ROOT_PENDING_ATTR,
    byLanguage: getBookIdByLanguage(bookIdList),
    ids: bookIdList,
    key: PREFERENCES.PREFERRED_BOOK_ID,
    maxMs: ROOT_PENDING_MAX_MS
  }).replace(/</g, '\\u003c');

  return `(function(d){try{var p=null;try{p=localStorage.getItem(d.key)}catch(e){}` +
    `var l=(navigator.language||Intl.DateTimeFormat().resolvedOptions().locale).slice(0,2).toLowerCase();` +
    `var t=p&&d.ids.indexOf(p)>=0?p:(d.byLanguage[l]||d.ids[0]);` +
    `if(t!==d.ids[0]){var h=document.documentElement;h.setAttribute(d.attr,'');` +
    `setTimeout(function(){h.removeAttribute(d.attr)},d.maxMs)}}catch(e){}})(${data});`;
}
