import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PrefRedirect from '@/components/home/PrefRedirect';
import { PREFERENCES } from '@/other/constants';
import { getBookLocale } from '@/other/helpers';
import { getBookIds } from '@/tests/helpers/books';

const bookIds = getBookIds();
let target: { href: string };

function setLanguage(language: string) {
  Object.defineProperty(navigator, 'language', { configurable: true, value: language });
}

function redirectFor({ stored, language }: { stored?: string; language: string }): string {
  if (stored) localStorage.setItem(PREFERENCES.PREFERRED_BOOK_ID, stored);
  setLanguage(language);
  render(<PrefRedirect bookIdList={bookIds} />);
  return target.href;
}

beforeEach(() => {
  target = { href: '' };
  vi.stubGlobal('location', target);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (navigator as { language?: string }).language;
});

describe('PrefRedirect', () => {
  it('shows a loader while it decides', () => {
    setLanguage('en-US');
    const { container } = render(<PrefRedirect bookIdList={bookIds} />);

    expect(container.querySelector('.Loader')).not.toBeNull();
  });

  it('opens the book the user chose before', () => {
    const stored = bookIds.find((id) => id !== 'en');

    expect(redirectFor({ stored, language: 'en-US' })).toBe(`/${stored}/`);
  });

  it('ignores a stored book that no longer exists', () => {
    expect(redirectFor({ stored: 'no-such-book', language: 'en-US' })).toBe('/en/');
  });

  it.each(bookIds.filter((id) => !id.includes('-')))('opens the %s book for a browser in its language', (bookId) => {
    expect(redirectFor({ language: `${getBookLocale(bookId)}-XX` })).toBe(`/${bookId}/`);
  });

  it('a real book id differs from its language code, so the case above checks the mapping', () => {
    expect(bookIds.some((id) => getBookLocale(id) !== id.split('-')[0])).toBe(true);
  });

  it('opens the English book for a language with no book', () => {
    expect(redirectFor({ language: 'ja-JP' })).toBe('/en/');
  });
});
