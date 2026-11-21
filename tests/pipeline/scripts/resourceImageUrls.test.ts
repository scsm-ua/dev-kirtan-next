import { describe, expect, it } from 'vitest';

import { findResourceImages } from '@/scripts/resourceImageUrls';
import resourcesConfig from '@/source/resources.json';

/** `https://github.com/<owner>/<repo>` of the shared resources package. */
const REPO = resourcesConfig.resources
  .replace(/^git\+/, '')
  .replace(/#.*$/, '')
  .replace(/\.git$/, '');
const RAW_REPO = REPO.replace('https://github.com/', 'https://raw.githubusercontent.com/');

describe('findResourceImages', () => {
  it('gives the public path of every resources-repo image, in order', () => {
    const text = [
      `![A](${REPO}/blob/main/images/en/1.jpg?raw=true)`,
      `text ![](${RAW_REPO}/feature/x/images/ru/2.png) more`
    ].join('\n');

    expect(findResourceImages(text)).toEqual(['/images/resources/en/1.jpg', '/images/resources/ru/2.png']);
  });

  it('ignores plain links, other sites and local images', () => {
    const text = [
      `[link](${REPO}/blob/main/images/en/1.jpg)`,
      '![x](https://example.com/images/en/1.jpg)',
      '![x](/images/resources/en/1.jpg)'
    ].join('\n');

    expect(findResourceImages(text)).toEqual([]);
  });
});
