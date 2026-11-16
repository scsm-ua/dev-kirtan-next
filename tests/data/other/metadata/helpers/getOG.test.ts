import { describe, expect, it } from 'vitest';

import { SITE } from '@/other/constants';
import { getOG } from '@/other/metadata/helpers/getOG';
import { getBannerUrlBase } from '@/other/helpers';
import { getAbsoluteUrl } from '@/other/paths';

describe('getOG', () => {
  it('describes the book root as a website by default', () => {
    expect(getOG('ua', 'Description', 'Title')).toMatchObject({
      description: 'Description',
      locale: 'uk',
      siteName: SITE.NAME,
      title: 'Title',
      type: 'website',
      url: getAbsoluteUrl('/ua/')
    });
  });

  it('uses the given path and type', () => {
    expect(getOG('en', 'Description', 'Title', '/en/some-song/', 'music.song')).toMatchObject({
      type: 'music.song',
      url: getAbsoluteUrl('/en/some-song/')
    });
  });

  it('offers the book banner in two sizes', () => {
    const { images } = getOG('en', 'Description', 'Title');
    const base = getBannerUrlBase('en');

    expect(images).toEqual([
      { url: `${base}.jpg`, width: 320, height: 190, type: 'image/jpeg' },
      { url: `${base}@2.jpg`, width: 640, height: 380, type: 'image/jpeg' }
    ]);
  });
});
