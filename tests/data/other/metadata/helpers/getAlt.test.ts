import { describe, expect, it } from 'vitest';

import { getAlt } from '@/other/metadata/helpers/getAlt';
import { getBookLocale } from '@/other/helpers';
import { getBookIds } from '@/tests/helpers/books';

const BOOK_IDS = getBookIds();
const LOCALES = [...new Set(BOOK_IDS.map(getBookLocale))].sort();

describe.each(BOOK_IDS)('getAlt for %s', (bookId) => {
  it('makes the book root the canonical and the default language version', () => {
    const { canonical, languages } = getAlt(bookId);

    expect(canonical).toBe(`/${bookId}/`);
    expect(languages['x-default']).toBe(`/${bookId}/`);
  });

  it('lists one version per language, the current book for its own language', () => {
    const byLocale = { ...(getAlt(bookId).languages as Record<string, string>) };
    delete byLocale['x-default'];

    expect(Object.keys(byLocale).sort()).toEqual(LOCALES);
    expect(byLocale[getBookLocale(bookId)]).toBe(`/${bookId}/`);

    for (const [locale, path] of Object.entries(byLocale)) {
      const candidates = BOOK_IDS.filter((id) => getBookLocale(id) === locale).map((id) => `/${id}/`);
      expect(candidates, locale).toContain(path);
    }
  });

  it('points to the same root page in every book', () => {
    const { canonical, languages } = getAlt(bookId, 'a-z');

    expect(canonical).toBe(`/${bookId}/a-z/`);
    expect(Object.values(languages).every((path) => String(path).endsWith('/a-z/'))).toBe(true);
  });

  it('skips the books that do not have the page', () => {
    const { languages } = getAlt(bookId, 'audio', (id) => id === bookId);

    expect(languages).toEqual({
      [getBookLocale(bookId)]: `/${bookId}/audio/`,
      'x-default': `/${bookId}/audio/`
    });
  });
});
