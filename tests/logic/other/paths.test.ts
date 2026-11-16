import { describe, expect, it } from 'vitest';

import {
  getAbsoluteUrl,
  getAudioSingerPage,
  getAudioSingerPath,
  getSongbookPagePath,
  getSongbookPath,
  getSongPath,
  getSongPathWithPage,
  SONGBOOK_PAGE
} from '@/other/paths';

import type { TContentItem } from '@/types/common';

/**/
function makeItem(page: string, pages: string[]): TContentItem {
  return {
    aliasName: 'first line',
    id: 'some-song',
    page,
    pages,
    title: 'Some Song',
    type: 'song',
    has: { audio: false, translation: true }
  };
}

describe('songbook paths', () => {
  it.each([
    [getSongbookPath('en'), '/en/'],
    [getSongbookPagePath('en', SONGBOOK_PAGE.A_Z), '/en/a-z/'],
    [getSongbookPagePath('en-pe', SONGBOOK_PAGE.CONTENTS), '/en-pe/contents/'],
    [getAudioSingerPath('en', 'some-singer'), '/en/audio/some-singer/'],
    [getSongPath('en', 'some-song'), '/en/some-song/']
  ])('%s', (actual, expected) => {
    expect(actual).toBe(expected);
  });

  it('builds the singer sub-path without slashes around it', () => {
    expect(getAudioSingerPage('some-singer')).toBe('audio/some-singer');
  });
});

describe('getSongPathWithPage', () => {
  it('adds no query for a song with one page', () => {
    expect(getSongPathWithPage('en', makeItem('10', ['10']))).toBe('/en/some-song/');
  });

  it('adds no query for the first of several pages', () => {
    expect(getSongPathWithPage('en', makeItem('10', ['10', '20']))).toBe('/en/some-song/');
  });

  it('adds ?p= for a later page', () => {
    expect(getSongPathWithPage('en', makeItem('20', ['10', '20']))).toBe('/en/some-song/?p=20');
  });

  it('prefers the explicit page over the item page', () => {
    const item = makeItem('10', ['10', '20']);

    expect(getSongPathWithPage('en', item, '20')).toBe('/en/some-song/?p=20');
    expect(getSongPathWithPage('en', makeItem('20', ['10', '20']), '10')).toBe('/en/some-song/');
  });
});

describe('getAbsoluteUrl', () => {
  it('joins the origin and the path with exactly one slash', () => {
    const expected = new URL('/en/a-z/', process.env.NEXT_PUBLIC_ORIGIN).href;

    expect(getAbsoluteUrl('/en/a-z/')).toBe(expected);
  });
});
