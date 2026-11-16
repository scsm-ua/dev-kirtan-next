import { describe, expect, it } from 'vitest';

import { getImagesMeta, localizeResourceImages } from '@/lib/content/resourceImages';
import resourcesConfig from '@/source/resources.json';
import { BOOKS_DIR, readJson } from '@/tests/helpers/books';

import type { TImageRenderer } from '@/lib/content/resourceImages';

/** `https://github.com/<owner>/<repo>` of the shared resources package. */
const REPO = resourcesConfig.resources
  .replace(/^git\+/, '')
  .replace(/#.*$/, '')
  .replace(/\.git$/, '');
const RAW_REPO = REPO.replace('https://github.com/', 'https://raw.githubusercontent.com/');

const META = { type: 'image/png', width: 10, height: 20, length: 1 };
const render: TImageRenderer = (alt, src, meta) => `<${alt}|${src}|${meta ? meta.width : 'no size'}>`;
const localize = (text: string) => localizeResourceImages(text, { 'en/1.png': META }, render);

describe('localizeResourceImages', () => {
  it.each([
    ['a blob URL', `${REPO}/blob/main/images/en/1.png`],
    ['a blob URL with a query', `${REPO}/blob/main/images/en/1.png?raw=true`],
    ['a raw URL', `${REPO}/raw/main/images/en/1.png`],
    ['a raw.githubusercontent.com URL', `${RAW_REPO}/main/images/en/1.png`],
    ['a branch with slashes', `${REPO}/blob/refs/heads/some-branch/images/en/1.png`]
  ])('renders an image from %s with its local path and size', (_name, url) => {
    expect(localize(`before ![Alt](${url}) after`)).toBe('before <Alt|/images/resources/en/1.png|10> after');
  });

  it('passes no size for an image without meta', () => {
    expect(localize(`![Alt](${REPO}/blob/main/images/en/2.png)`)).toBe('<Alt|/images/resources/en/2.png|no size>');
  });

  it('points a plain link to the local copy', () => {
    expect(localize(`[text](${REPO}/blob/main/images/en/1.png)`)).toBe('[text](/images/resources/en/1.png)');
  });

  it('leaves other images and links alone', () => {
    const text = '![Alt](https://example.com/images/en/1.png) [text](/en/some-song/)';

    expect(localize(text)).toBe(text);
  });
});

describe('getImagesMeta', () => {
  it('reads source/books/images.json', async () => {
    expect(await getImagesMeta()).toEqual(readJson(BOOKS_DIR, 'images.json'));
  });
});
