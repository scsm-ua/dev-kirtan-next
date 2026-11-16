import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { postbuild, redirectHtml } from '@/scripts/postbuild';
import { getBookIds, getItems } from '@/tests/helpers/books';
import { useTempDirs } from '@/tests/helpers/tempDirs';

describe('redirectHtml', () => {
  const target = 'https://example.org/en/some-song/';
  const html = redirectHtml(target);

  it('points crawlers and browsers to the target', () => {
    expect(html).toContain(`<link rel="canonical" href="${target}">`);
    expect(html).toContain(`<meta http-equiv="refresh" content="0; url=${target}">`);
    expect(html).toContain(`location.replace("${target}")`);
    expect(html).toContain(`<a href="${target}">`);
  });
});

describe('postbuild', () => {
  const makeTempDir = useTempDirs();

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('turns Jekyll off for GitHub Pages', () => {
    const dir = makeTempDir();

    postbuild(dir, 'https://example.org/');

    expect(readFileSync(path.join(dir, '.nojekyll'), 'utf8')).toBe('');
  });

  it('writes a legacy .html redirect for every item of every book', () => {
    const dir = makeTempDir();

    postbuild(dir, 'https://example.org//');

    const problems: string[] = [];
    let checked = 0;

    for (const bookId of getBookIds()) {
      for (const { id } of getItems(bookId)) {
        const file = path.join(dir, bookId, `${id}.html`);
        const expected = redirectHtml(`https://example.org/${bookId}/${id}/`);
        checked++;

        if (!existsSync(file)) problems.push(`${bookId}/${id}: no file`);
        else if (readFileSync(file, 'utf8') !== expected) problems.push(`${bookId}/${id}: wrong target`);
      }
    }

    expect(checked).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });
});
