import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  applyPageIdxDict,
  findSplitDuplicates,
  getAltFirstLines,
  getItemImages,
  getItemType,
  getPage,
  getPages,
  mapItem,
  mapResources,
  transformContents
} from '@/scripts/transformContents';
import resourcesConfig from '@/source/resources.json';
import { useTempDirs } from '@/tests/helpers/tempDirs';

/** Markdown image of the shared resources repo, by its path under `images/`. */
const resourceImage = (rel: string) =>
  `![](${resourcesConfig.resources.replace(/^git\+/, '').replace(/#.*$/, '').replace(/\.git$/, '')}/blob/main/images/${rel}?raw=true)`;

/**/
function audio(personId: string, personSlug: string, title: Record<string, string>) {
  return { embed_url: `https://example.com/${personSlug}`, personId, personSlug, title };
}

describe('getPage', () => {
  it('returns the page of a song with one page', () => {
    expect(getPage({ page: 7 }, 'a', new Set())).toBe(7);
  });

  it('returns the first page, then the second one for a repeated song', () => {
    const seen = new Set<string>();

    expect(getPage({ page: [7, 20] }, 'a', seen)).toBe(7);
    expect(getPage({ page: [7, 20] }, 'a', seen)).toBe(20);
    expect(getPage({ page: [8, 30] }, 'b', seen)).toBe(8);
  });

  it('returns null without meta', () => {
    expect(getPage(undefined, 'a', new Set())).toBeNull();
  });
});

describe('getPages', () => {
  it.each([
    [undefined, []],
    [{}, []],
    [{ page: 7 }, [7]],
    [{ page: [7, 20] }, [7, 20]]
  ])('%o → %o', (meta, expected) => {
    expect(getPages(meta)).toEqual(expected);
  });
});

describe('getAltFirstLines', () => {
  it.each([
    [undefined, []],
    [{}, []],
    [{ alt_first_lines: 'one' }, ['one']],
    [{ alt_first_lines: ['one', 'two'] }, ['one', 'two']]
  ])('%o → %o', (meta, expected) => {
    expect(getAltFirstLines(meta)).toEqual(expected);
  });
});

describe('getItemType', () => {
  it('reads the type from the source folder', () => {
    expect(getItemType({ filepath: 'pages/about.md' })).toBe('page');
    expect(getItemType({ filepath: 'songs/some-song.md' })).toBe('song');
  });
});

describe('mapResources', () => {
  const zeta = audio('Zeta', 'zeta', { en: 'Zeta', ru: 'Зета' });
  const alpha = audio('Alpha', 'alpha', { en: 'Alpha' });
  const image = { src: '/images/a.png', type: 'image/png', width: 1, height: 1, length: 1 };

  it('returns nothing for a song without resources', () => {
    expect(mapResources(undefined, null, 'en')).toBeUndefined();
  });

  it('uses the singer name of the book language, English as a fallback', () => {
    const { audio: result } = mapResources({ audio: [zeta, alpha] }, null, 'ru');

    expect(result).toEqual([
      { embed_url: alpha.embed_url, personSlug: 'alpha', title: 'Alpha' },
      { embed_url: zeta.embed_url, personSlug: 'zeta', title: 'Зета' }
    ]);
  });

  it('keeps only the singers of the book filter', () => {
    const { audio: result } = mapResources({ audio: [zeta, alpha] }, ['Zeta'], 'en');

    expect(result.map((item) => item.personSlug)).toEqual(['zeta']);
  });

  it('keeps the image when the filter removes all audio', () => {
    expect(mapResources({ audio: [zeta], image }, ['Nobody'], 'en')).toEqual({ image });
  });

  it('returns nothing when the filter removes everything', () => {
    expect(mapResources({ audio: [zeta] }, ['Nobody'], 'en')).toBeUndefined();
  });

  it('does not change its input', () => {
    const resource = { audio: [zeta, alpha] };
    const copy = structuredClone(resource);

    mapResources(resource, null, 'en');

    expect(resource).toEqual(copy);
  });
});

describe('applyPageIdxDict', () => {
  const apply = (page: unknown, itemIdx: number, dict: Record<string, number[]>) => {
    const song = { meta: { first_line: 'line', page } };
    applyPageIdxDict(song, itemIdx, dict);
    return song.meta.page;
  };

  it('keeps a page that one song has', () => {
    expect(apply(11, 3, { 11: [3] })).toBe(11);
  });

  it('numbers the songs that share a page', () => {
    expect(apply(11, 3, { 11: [3, 5] })).toBe('11/1');
    expect(apply(11, 5, { 11: [3, 5] })).toBe('11/2');
  });

  it('numbers only the shared pages of a song with several pages', () => {
    expect(apply([11, 20], 5, { 11: [3, 5], 20: [5] })).toEqual(['11/2', 20]);
  });

  it('keeps the page of a song that is not in the list', () => {
    expect(apply(11, 9, { 11: [3, 5] })).toBe(11);
  });

  it('accepts a song without a page', () => {
    const song = { meta: { first_line: 'line' } };

    applyPageIdxDict(song, 0, {});

    expect(song).toEqual({ meta: { first_line: 'line' } });
  });
});

describe('findSplitDuplicates', () => {
  const items = (ids: string, pages: Record<string, unknown> = {}) =>
    ids.split(' ').map((id) => ({ id, page: id in pages ? pages[id] : 1 }));
  const split = (ids: string, pages?: Record<string, unknown>) =>
    findSplitDuplicates(items(ids, pages)).map((item: { id: string }) => item.id);

  it('accepts listings that follow each other and repeated blocks', () => {
    expect(split('a b c')).toEqual([]);
    expect(split('a a b')).toEqual([]);
    expect(split('a b a b c')).toEqual([]);
    expect(split('a b a x b')).toEqual([]);
  });

  it('reports a listing with other songs before its repeat', () => {
    expect(split('a x a')).toEqual(['a']);
    expect(split('a b x a b')).toEqual(['a', 'b']);
  });

  it('compares the page too, and treats items without a page as the same place', () => {
    expect(findSplitDuplicates([{ id: 'a', page: 5 }, { id: 'x', page: 6 }, { id: 'a', page: 9 }])).toEqual([]);
    expect(split('a x a', { a: null })).toEqual(['a']);
  });
});

describe('mapItem', () => {
  const item = { id: 'some-song', title: 'Some Song', filepath: 'songs/some-song.md' };
  const map = (song: object) => mapItem(item, song, new Set());

  it('builds the contents item of a song', () => {
    const song = {
      author: ['by Author Line'],
      meta: { first_line: 'first line', page: 7, author: 'Meta Author' },
      resources: { audio: [{ title: 'Singer' }] }
    };

    expect(map(song)).toEqual({
      aliasName: 'first line',
      author: 'Meta Author',
      id: 'some-song',
      page: 7,
      pages: [7],
      title: 'Some Song',
      type: 'song',
      has: { audio: true, translation: true }
    });
  });

  it.each([
    ['the author line without meta.author', { author: ['by Author Line'], meta: {} }, 'by Author Line'],
    ['null without any author', { meta: {} }, null],
    [
      'null for a song marked as having no author',
      { author: ['by Author Line'], meta: { author: 'Meta Author', 'no-author': 1 } },
      null
    ]
  ])('uses %s', (_name, song, expected) => {
    expect(map(song).author).toBe(expected);
  });

  it('adds the alternative first lines only when the song has them', () => {
    expect(map({ meta: { alt_first_lines: 'other line' } }).altAliasNames).toEqual(['other line']);
    expect(map({ meta: {} })).not.toHaveProperty('altAliasNames');
  });

  it('marks a song without audio or translation', () => {
    expect(map({ meta: { translation: 'no' } }).has).toEqual({ audio: false, translation: false });
  });
});

describe('getItemImages', () => {
  const head = { src: '/images/resources/en/1.jpg', type: 'image/jpeg', width: 1, height: 1, length: 1 };

  it('gives the head image and the images in the verse translations of a song', () => {
    const song = {
      meta: {},
      resources: { image: head },
      verses: [{ text: [resourceImage('en/9.jpg')], translation: [`a ${resourceImage('en/2.jpg')}`] }, { text: [] }]
    };

    expect(getItemImages(song, 'song')).toEqual(['/images/resources/en/1.jpg', '/images/resources/en/2.jpg']);
  });

  it('gives the images in the body of a page', () => {
    expect(getItemImages({ meta: {}, body: `x ${resourceImage('ru/3.png')}` }, 'page')).toEqual([
      '/images/resources/ru/3.png'
    ]);
  });

  it('gives nothing for an item without images', () => {
    expect(getItemImages({ meta: {} }, 'song')).toEqual([]);
    expect(getItemImages({ meta: {} }, 'page')).toEqual([]);
  });
});

describe('transformContents', () => {
  const makeTempDir = useTempDirs();
  const readJson = (...parts: string[]) => JSON.parse(readFileSync(path.join(...parts), 'utf8'));

  it('rewrites contents.json and the song files of a book', () => {
    const dir = makeTempDir();
    const write = (file: string, data: unknown) => {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      writeFileSync(path.join(dir, file), JSON.stringify(data));
    };

    // "one" is listed twice and has two pages; "one" and "two" share page 5.
    write('contents.json', [
      {
        name: 'Group',
        items: [
          { id: 'one', title: 'One', filepath: 'songs/one.md' },
          { id: 'two', title: 'Two', filepath: 'songs/two.md' },
          { id: 'about', title: 'About', filepath: 'pages/about.md' },
          { id: 'one', title: 'One', filepath: 'songs/one.md' }
        ]
      }
    ]);
    write('songs/one.json', { meta: { first_line: 'first one', page: [5, 9], author: 'Author A' } });
    write('songs/two.json', { author: ['by Author B'], meta: { first_line: 'first two', page: 5 } });
    write('pages/about.json', { meta: { title: 'About', page: 1 }, body: 'text' });

    const resourceMap = { one: { audio: [audio('Singer', 'singer', { en: 'Singer' })] } };
    transformContents(dir, resourceMap, { audioTitleFilter: null, language: 'en' });

    const one = {
      aliasName: 'first one',
      author: 'Author A',
      id: 'one',
      page: '5/1',
      pages: ['5/1', 9],
      title: 'One',
      type: 'song',
      has: { audio: true, translation: true }
    };

    expect(readJson(dir, 'contents.json')).toEqual([
      {
        name: 'Group',
        items: [
          one,
          {
            aliasName: 'first two',
            author: 'by Author B',
            id: 'two',
            page: '5/2',
            pages: ['5/2'],
            title: 'Two',
            type: 'song',
            has: { audio: false, translation: true }
          },
          {
            author: null,
            id: 'about',
            page: 1,
            pages: [1],
            title: 'About',
            type: 'page',
            has: { audio: false, translation: true }
          },
          { ...one, page: 9 }
        ]
      }
    ]);

    expect(readJson(dir, 'songs/one.json')).toEqual({
      meta: { first_line: 'first one', page: ['5/1', 9], author: 'Author A' },
      resources: {
        audio: [{ embed_url: 'https://example.com/singer', personSlug: 'singer', title: 'Singer' }]
      }
    });
    expect(readJson(dir, 'songs/two.json').meta.page).toBe('5/2');
    expect(readJson(dir, 'pages/about.json')).toEqual({ meta: { title: 'About', page: 1 }, body: 'text' });
    expect(readJson(dir, 'content-images.json')).toEqual([]);
  });

  it('writes the images of all songs and pages of the book, sorted and unique', () => {
    const dir = makeTempDir();
    const write = (file: string, data: unknown) => {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      writeFileSync(path.join(dir, file), JSON.stringify(data));
    };

    write('contents.json', [
      {
        name: 'Group',
        items: [
          { id: 'one', title: 'One', filepath: 'songs/one.md' },
          { id: 'about', title: 'About', filepath: 'pages/about.md' }
        ]
      }
    ]);
    write('songs/one.json', { meta: { first_line: 'first one' }, verses: [{ translation: [resourceImage('en/2.jpg')] }] });
    write('pages/about.json', { meta: { title: 'About' }, body: `${resourceImage('en/2.jpg')} ${resourceImage('en/10.jpg')}` });

    const image = { src: '/images/resources/en/1.jpg', type: 'image/jpeg', width: 1, height: 1, length: 1 };
    transformContents(dir, { one: { image } }, { audioTitleFilter: null, language: 'en' });

    expect(readJson(dir, 'content-images.json')).toEqual([
      '/images/resources/en/1.jpg',
      '/images/resources/en/10.jpg',
      '/images/resources/en/2.jpg'
    ]);
  });
});
