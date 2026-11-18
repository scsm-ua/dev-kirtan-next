import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validateSongbooks } from '@/scripts/validation/validateSongbooks';
import { getBooksMap, readJson, ROOT } from '@/tests/helpers/books';

const BOOK = { slug: 'en', songsCount: 5, subtitle: 'Subtitle', title: 'Title' };

describe('validateSongbooks', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const expectFailure = (slugs: string[], songbooks: object) => {
    expect(() => validateSongbooks(slugs, songbooks)).toThrow('process.exit');
    expect(process.exit).toHaveBeenCalledWith(1);
  };

  it('accepts the real songbooks', () => {
    const slugs = Object.keys(readJson<object>(ROOT, 'source/songbooks.json'));

    validateSongbooks(slugs, getBooksMap());

    expect(process.exit).not.toHaveBeenCalled();
  });

  it('accepts a minimal book and optional settings', () => {
    const shortcuts = [{ icon: 'clock', slug: 'some-page', title: 'Some Page' }];

    validateSongbooks(['en', 'ru'], {
      en: BOOK,
      ru: { ...BOOK, hidden: true, is_legacy: { show_micro_thumbnail_on_main: true }, shortcuts }
    });

    expect(process.exit).not.toHaveBeenCalled();
  });

  it('rejects a missing book', () => {
    expectFailure(['en', 'ru'], { en: BOOK });
  });

  it('rejects a book that is not in the list', () => {
    expectFailure(['en'], { en: BOOK, ru: BOOK });
  });

  it.each(['slug', 'songsCount', 'subtitle', 'title'])('rejects a book without %s', (key) => {
    const book: Record<string, unknown> = { ...BOOK };
    delete book[key];

    expectFailure(['en'], { en: book });
  });

  it('rejects a value of the wrong type', () => {
    expectFailure(['en'], { en: { ...BOOK, songsCount: '5' } });
  });

  it('rejects an invalid is_legacy value', () => {
    expectFailure(['en'], { en: { ...BOOK, is_legacy: 'true' } });
    expectFailure(['en'], { en: { ...BOOK, is_legacy: { show_micro_thumbnail_on_main: 'true' } } });
  });

  it('rejects an incomplete shortcut', () => {
    expectFailure(['en'], { en: { ...BOOK, shortcuts: [{ slug: 'some-page', title: 'Some Page' }] } });
  });
});
