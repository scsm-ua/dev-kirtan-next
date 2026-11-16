import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { create, createAuthors } from '@/scripts/createAuthors';
import { useTempDirs } from '@/tests/helpers/tempDirs';

/**/
function song(id: string, author: string | null, aliasName: string) {
  return { id, author, aliasName, title: `Title of ${id}`, type: 'song' };
}

const GROUPS = [
  {
    name: 'One',
    items: [
      song('b1', 'B Author', 'zeta'),
      song('a1', 'A Author', 'alpha'),
      song('n1', null, 'no author'),
      { id: 'page', author: null, title: 'Page', type: 'page' },
      song('intro', 'B Author', 'intro line')
    ]
  },
  {
    name: 'Two',
    items: [song('b2', 'B Author', 'āmāra'), song('b1', 'B Author', 'zeta')]
  }
];

describe('create', () => {
  const result = create(GROUPS);

  it('groups songs by author, the biggest group first, then by name', () => {
    expect(result.map((group) => group.name)).toEqual(['B Author', null, 'A Author']);
  });

  it('sorts the songs of an author by the first line', () => {
    expect(result[0].items.map((item) => item.id)).toEqual(['b2', 'b1']);
  });

  it('skips pages, the intro and repeated songs', () => {
    const ids = result.flatMap((group) => group.items.map((item) => item.id));

    expect(ids.sort()).toEqual(['a1', 'b1', 'b2', 'n1']);
  });
});

describe('createAuthors', () => {
  const makeTempDir = useTempDirs();

  it('writes authors.json from contents.json', () => {
    const dir = makeTempDir();
    writeFileSync(path.join(dir, 'contents.json'), JSON.stringify(GROUPS));

    createAuthors(dir);

    const written = JSON.parse(readFileSync(path.join(dir, 'authors.json'), 'utf8'));
    expect(written).toEqual(create(GROUPS));
  });
});
