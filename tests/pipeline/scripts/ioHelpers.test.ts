import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { readFile, writeFile } from '@/scripts/ioHelpers';
import { useTempDirs } from '@/tests/helpers/tempDirs';

describe('ioHelpers', () => {
  const makeTempDir = useTempDirs();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads a JSON file', () => {
    const dir = makeTempDir();
    writeFileSync(path.join(dir, 'a.json'), '{"a":1}');

    expect(readFile(dir, 'a.json')).toEqual({ a: 1 });
  });

  it('gives every caller its own object', () => {
    const dir = makeTempDir();
    writeFileSync(path.join(dir, 'a.json'), '{"a":1}');

    readFile(dir, 'a.json').a = 2;

    expect(readFile(dir, 'a.json')).toEqual({ a: 1 });
  });

  it('reads what writeFile wrote, also after an earlier read', () => {
    const dir = makeTempDir();
    writeFile(dir, 'a.json', '{"a":1}');
    readFile(dir, 'a.json');

    writeFile(dir, 'a.json', '{"a":2}');

    expect(readFile(dir, 'a.json')).toEqual({ a: 2 });
  });

  it('reports a missing file and returns nothing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(readFile(makeTempDir(), 'missing.json')).toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
  });
});
