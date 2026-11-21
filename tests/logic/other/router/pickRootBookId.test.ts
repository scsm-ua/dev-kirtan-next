import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

import { PREFERENCES } from '@/other/constants';
import { getBookLocale } from '@/other/helpers';
import { getRootPendingScript, pickRootBookId, ROOT_PENDING_ATTR } from '@/other/router/pickRootBookId';
import { getBookIds } from '@/tests/helpers/books';

const bookIds = getBookIds();
const [firstBookId] = bookIds;
const mainBookIds = bookIds.filter((id) => !id.includes('-'));
const otherBookId = bookIds.find((id) => id !== firstBookId);

describe('pickRootBookId', () => {
  it('picks the book the reader chose before, whatever the language', () => {
    expect(pickRootBookId(otherBookId, bookIds, `${getBookLocale(firstBookId)}-XX`)).toBe(otherBookId);
  });

  it('picks a chosen variant book too', () => {
    const variant = bookIds.find((id) => id.includes('-'));
    expect(pickRootBookId(variant, bookIds, 'ja-JP')).toBe(variant);
  });

  it('ignores a chosen book that no longer exists', () => {
    expect(pickRootBookId('no-such-book', bookIds, 'ja-JP')).toBe(firstBookId);
  });

  it.each(mainBookIds)('picks the %s book for a browser in its language', (bookId) => {
    expect(pickRootBookId(null, bookIds, `${getBookLocale(bookId)}-XX`)).toBe(bookId);
    expect(pickRootBookId(null, bookIds, getBookLocale(bookId).toUpperCase())).toBe(bookId);
  });

  it('a real book id differs from its language code, so the case above checks the mapping', () => {
    expect(mainBookIds.some((id) => getBookLocale(id) !== id)).toBe(true);
  });

  it('never picks a variant book by the language', () => {
    expect(pickRootBookId(null, ['en', 'ru-kdm', 'ru'], 'ru-RU')).toBe('ru');
    expect(pickRootBookId(null, ['en', 'ru-kdm'], 'ru-RU')).toBe('en');
  });

  it('picks the first book for a language with no book, and with no language', () => {
    expect(pickRootBookId(null, bookIds, 'ja-JP')).toBe(firstBookId);
    expect(pickRootBookId(null, bookIds, '')).toBe(firstBookId);
  });
});

describe('getRootPendingScript', () => {
  /** Runs the inline script as the browser does; tells whether it marked `<html>`. */
  function run({ stored, language, isStorageBlocked = false }: { stored?: string; language: string; isStorageBlocked?: boolean }) {
    const attributes = new Set<string>();
    const timers: Array<() => void> = [];
    vm.runInNewContext(getRootPendingScript(bookIds), {
      document: {
        documentElement: {
          removeAttribute: (name: string) => attributes.delete(name),
          setAttribute: (name: string) => attributes.add(name)
        }
      },
      Intl,
      localStorage: {
        getItem: (key: string) => {
          if (isStorageBlocked) throw new Error('blocked');
          return key === PREFERENCES.PREFERRED_BOOK_ID ? (stored ?? null) : null;
        }
      },
      navigator: { language },
      setTimeout: (callback: () => void) => timers.push(callback)
    });

    return { isPending: attributes.has(ROOT_PENDING_ATTR), attributes, timers };
  }

  const CASES: Array<{ stored?: string; language: string }> = [
    ...bookIds.map((stored) => ({ stored, language: 'ja-JP' })),
    ...mainBookIds.map((bookId) => ({ language: `${getBookLocale(bookId)}-XX` })),
    { stored: 'no-such-book', language: `${getBookLocale(otherBookId)}-XX` },
    { language: 'ja-JP' }
  ];

  it.each(CASES)('marks the document exactly when the pick is not the first book: %o', ({ stored, language }) => {
    const isOtherBook = pickRootBookId(stored ?? null, bookIds, language) !== firstBookId;

    expect(run({ stored, language }).isPending).toBe(isOtherBook);
  });

  it('goes by the language when the storage is blocked', () => {
    expect(run({ language: `${getBookLocale(otherBookId)}-XX`, isStorageBlocked: true }).isPending).toBe(true);
    expect(run({ language: `${getBookLocale(firstBookId)}-XX`, isStorageBlocked: true }).isPending).toBe(false);
  });

  it('drops the mark by itself after a while, in case the app never starts', () => {
    const { attributes, timers } = run({ stored: otherBookId, language: 'ja-JP' });
    expect(timers).toHaveLength(1);

    timers[0]();
    expect(attributes.has(ROOT_PENDING_ATTR)).toBe(false);
  });

  it('cannot close its script tag from inside', () => {
    expect(getRootPendingScript(['</script><b>'])).not.toContain('<');
  });
});
