import { describe, expect, it } from 'vitest';

import {
  getBannerUrl,
  getBannerUrlBase,
  getBookLangLabel,
  getBookLocale,
  getIFrameUrl
} from '@/other/helpers';

describe('book language', () => {
  it.each([
    ['en', 'EN', 'en'],
    ['en-2022', 'EN', 'en'],
    ['ru-kdm', 'RU', 'ru'],
    ['ua', 'UA', 'uk'],
    ['ua-x', 'UA', 'uk']
  ])('%s → label %s, locale %s', (slug, label, locale) => {
    expect(getBookLangLabel(slug)).toBe(label);
    expect(getBookLocale(slug)).toBe(locale);
  });
});

describe('banner URL', () => {
  it('points to the cover folder of the site origin', () => {
    const expected = new URL('images/cover/banner-en-pe.jpg', process.env.NEXT_PUBLIC_ORIGIN).href;

    expect(getBannerUrl('en-pe')).toBe(expected);
    expect(getBannerUrl('en-pe')).toBe(getBannerUrlBase('en-pe') + '.jpg');
  });
});

describe('getIFrameUrl', () => {
  it('passes the audio URL to the SoundCloud player intact', () => {
    const audioUrl = 'https://soundcloud.com/some-user/some-track?a=1&b=2';
    const url = new URL(getIFrameUrl(audioUrl));

    expect(url.origin + url.pathname).toBe('https://w.soundcloud.com/player/');
    expect(url.searchParams.get('url')).toBe(audioUrl);
  });
});
