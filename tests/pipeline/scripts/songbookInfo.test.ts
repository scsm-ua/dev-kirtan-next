import { describe, expect, it } from 'vitest';

import { createSongbookInfo, getSongbookRepositories } from '@/scripts/songbookInfo';
import { getBookIds, getBooksMap, readJson, ROOT } from '@/tests/helpers/books';

/** Site settings: a repository URL, or an object with `repository` and overrides. */
const SETTINGS = readJson<Record<string, string | Record<string, unknown>>>(ROOT, 'source/songbooks.json');
const SLUGS = Object.keys(SETTINGS);

describe('getSongbookRepositories', () => {
  it('returns a repository for every book of source/songbooks.json, in order', () => {
    const repositories = getSongbookRepositories();

    expect(Object.keys(repositories)).toEqual(SLUGS);

    for (const slug of SLUGS) {
      const entry = SETTINGS[slug];
      expect(repositories[slug], slug).toBe(typeof entry === 'string' ? entry : entry.repository);
      expect(repositories[slug], slug).toBeTruthy();
    }
  });
});

describe('createSongbookInfo', () => {
  it('merges site settings and preserves package metadata', () => {
    expect(createSongbookInfo('en-2022')).toMatchObject({ is_legacy: { show_micro_thumbnail_on_main: true } });
    expect(createSongbookInfo('en-2022')).toMatchObject({ hidden: false });
    expect(createSongbookInfo('en-pe')).toMatchObject({ is_legacy: { show_micro_thumbnail_on_main: true } });
    expect(createSongbookInfo('ru-kdm')).toMatchObject({ hidden: true });
  });

  it('has an entry in source/books/songbooks.json for every book, in order', () => {
    expect(getBookIds()).toEqual(SLUGS);
  });

  it.each(SLUGS)('%s: merges the package info, the site settings and the song count', (slug) => {
    const info = createSongbookInfo(slug);
    const entry = SETTINGS[slug];
    const overrides = typeof entry === 'string' ? {} : { ...entry };
    delete overrides.repository;

    expect(info).toEqual(getBooksMap()[slug]);
    expect(info).toMatchObject(overrides);
    expect(info).not.toHaveProperty('repository');
    expect(info.sort_order).toBe(SLUGS.indexOf(slug) + 1);
    expect(info.songsCount).toBeGreaterThan(0);
  });
});
