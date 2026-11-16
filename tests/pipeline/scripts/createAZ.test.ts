import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  convert,
  createAZ,
  getFirstLetter,
  makeLineVersions,
  processLineEnding
} from '@/scripts/createAZ';
import { useTempDirs } from '@/tests/helpers/tempDirs';

/**/
function song(id: string, aliasName: string, extra: object = {}) {
  return { id, aliasName, title: `Title of ${id}`, type: 'song', ...extra };
}

const aliases = (items: Array<{ aliasName: string }>) => items.map((item) => item.aliasName);

describe('processLineEnding', () => {
  it.each([
    ['jaya rādhe,', 'jaya rādhe'],
    ['jaya rādhe-', 'jaya rādhe'],
    ['jaya rādhe', 'jaya rādhe'],
    ['gaura-hari, jaya', 'gaura-hari, jaya']
  ])('"%s" → "%s"', (line, expected) => {
    expect(processLineEnding(line)).toBe(expected);
  });
});

describe('getFirstLetter', () => {
  it.each([
    ['jaya', 'j'],
    ['Jaya', 'j'],
    ['(kiba) jaya', 'k'],
    ['‘hari', 'h'],
    ['«text', 't'],
    ['āmāra', 'a'],
    ['śrī', 's'],
    // Cyrillic letters with marks are letters of their own.
    ['йога', 'й'],
    ['ёлка', 'ё']
  ])('%s → %s', (aliasName, expected) => {
    expect(getFirstLetter({ aliasName })).toBe(expected);
  });
});

describe('makeLineVersions', () => {
  it('makes one entry for a plain first line', () => {
    expect(makeLineVersions([song('a', 'jaya rādhe,')])).toEqual([
      { id: 'a', aliasName: 'jaya rādhe', title: 'Title of a', type: 'song' }
    ]);
  });

  it('adds an entry without the leading words in brackets', () => {
    expect(aliases(makeLineVersions([song('a', '(kiba) jaya jaya')]))).toEqual([
      '(kiba) jaya jaya',
      'jaya jaya'
    ]);
  });

  it('adds nothing for a line that is all in brackets', () => {
    expect(aliases(makeLineVersions([song('a', '(refrain)')]))).toEqual(['(refrain)']);
  });

  it('adds the alternative first lines once each', () => {
    const item = song('a', 'first', { altAliasNames: ['second', 'first', '(or) third'] });
    const versions = makeLineVersions([item]);

    expect(aliases(versions)).toEqual(['first', 'second', '(or) third', 'third']);
    expect(versions.every((version) => !('altAliasNames' in version))).toBe(true);
  });

  it('skips repeated songs, the intro and items without a first line', () => {
    const items = [
      song('a', 'first'),
      song('a', 'first'),
      song('intro', 'intro line'),
      { id: 'page', title: 'Page', type: 'page' }
    ];

    expect(makeLineVersions(items).map((item) => item.id)).toEqual(['a']);
  });
});

describe('convert', () => {
  const groups = [
    { name: 'One', items: [song('b', 'bhaja'), song('a2', 'amara dui')] },
    { name: 'Two', items: [song('s', 'śrī'), song('a1', 'āmāra'), { id: 'p', title: 'Page', type: 'page' }] }
  ];

  it('groups songs by the first letter, letters and songs in order', () => {
    const result = convert(groups).map((group) => [group.name, group.items.map((item) => item.id)]);

    expect(result).toEqual([
      ['A', ['a1', 'a2']],
      ['B', ['b']],
      ['S', ['s']]
    ]);
  });

  it('swaps the title and the first line', () => {
    const [item] = convert(groups)[0].items;

    expect(item).toMatchObject({ id: 'a1', title: 'āmāra', aliasName: 'Title of a1' });
  });
});

describe('createAZ', () => {
  const makeTempDir = useTempDirs();

  it('writes a-z.json from contents.json', () => {
    const dir = makeTempDir();
    const groups = [{ name: 'One', items: [song('b', 'bhaja'), song('a', 'āmāra')] }];
    writeFileSync(path.join(dir, 'contents.json'), JSON.stringify(groups));

    createAZ(dir);

    const written = JSON.parse(readFileSync(path.join(dir, 'a-z.json'), 'utf8'));
    expect(written).toEqual(convert(groups));
    expect(written.map((group) => group.name)).toEqual(['A', 'B']);
  });
});
