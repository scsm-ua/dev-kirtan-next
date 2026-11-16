import { describe, expect, it } from 'vitest';

import { DEFAULT_LANGUAGE, isValidBookId, translate } from '@/other/i18n';
import translations from '@/source/translations.json';

const LANGUAGES = Object.keys(translations);

/** Key chains (`A.B.C`) of every string in a translations subtree. */
function getLeafKeys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  if (!node || typeof node !== 'object') return [];

  return Object.entries(node).flatMap(([key, value]) =>
    getLeafKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

const DEFAULT_KEYS = getLeafKeys(translations[DEFAULT_LANGUAGE]);
const [SOME_KEY] = DEFAULT_KEYS;

/** Reads a key chain straight from the JSON. */
function read(language: string, keyChain: string): unknown {
  return keyChain.split('.').reduce((node, key) => node?.[key], translations[language]);
}

describe('translate', () => {
  it('has keys to test with', () => {
    expect(DEFAULT_KEYS.length).toBeGreaterThan(0);
  });

  it.each(LANGUAGES)('returns the string of the language: %s', (language) => {
    for (const key of getLeafKeys(translations[language])) {
      expect(translate(language, key), key).toBe(read(language, key));
    }
  });

  it.each(LANGUAGES)('finds a non-empty string for every default key: %s', (language) => {
    for (const key of DEFAULT_KEYS) {
      expect(translate(language, key), key).not.toBe('');
    }
  });

  it('uses the first two letters of the book id as the language', () => {
    expect(translate(`${DEFAULT_LANGUAGE}-2022`, SOME_KEY)).toBe(translate(DEFAULT_LANGUAGE, SOME_KEY));
  });

  it('falls back to the default language for an unknown one', () => {
    expect(translate('xx', SOME_KEY)).toBe(read(DEFAULT_LANGUAGE, SOME_KEY));
  });

  it('returns an empty string for an unknown key', () => {
    expect(translate(DEFAULT_LANGUAGE, 'NO.SUCH.KEY')).toBe('');
  });
});

describe('isValidBookId', () => {
  it.each(LANGUAGES)('accepts %s', (language) => {
    expect(isValidBookId(language)).toBe(true);
  });

  it('rejects an unknown id', () => {
    expect(isValidBookId('xx')).toBe(false);
  });
});
