import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validateTranslations } from '@/scripts/validation/validateTranslations';
import { TRANSLATION_VALIDATION_SCHEMA } from '@/scripts/validation/validationSchema';
import { readJson, ROOT } from '@/tests/helpers/books';

const TRANSLATIONS = readJson<Record<string, Record<string, unknown>>>(ROOT, 'source/translations.json');
const [LANGUAGE] = Object.keys(TRANSLATIONS);
const [REQUIRED_KEY] = TRANSLATION_VALIDATION_SCHEMA.required;

describe('validateTranslations', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const expectFailure = (slugs: string[], translations: object) => {
    expect(() => validateTranslations(slugs, translations)).toThrow('process.exit');
    expect(process.exit).toHaveBeenCalledWith(1);
  };

  it('accepts the real translations for the real books', () => {
    const slugs = Object.keys(readJson<object>(ROOT, 'source/songbooks.json'));

    validateTranslations(slugs, TRANSLATIONS);

    expect(process.exit).not.toHaveBeenCalled();
  });

  it('takes the language from the first two letters of a book slug', () => {
    validateTranslations([`${LANGUAGE}-edition`], TRANSLATIONS);

    expect(process.exit).not.toHaveBeenCalled();
  });

  it('rejects a book whose language has no translations', () => {
    expectFailure(['xx-book'], TRANSLATIONS);
  });

  it('rejects a language with a missing key', () => {
    const incomplete = { ...TRANSLATIONS[LANGUAGE] };
    delete incomplete[REQUIRED_KEY];

    expectFailure([LANGUAGE], { [LANGUAGE]: incomplete });
  });

  it('rejects a language with an unknown key', () => {
    const extended = { ...TRANSLATIONS[LANGUAGE], UNKNOWN_KEY: 'text' };

    expectFailure([LANGUAGE], { [LANGUAGE]: extended });
  });
});
