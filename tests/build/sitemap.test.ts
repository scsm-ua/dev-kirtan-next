import { describe, expect, it } from 'vitest';

import { getRoutePath } from '@/other/router/routes';
import { getBookIds, getBooksMap } from '@/tests/helpers/books';
import {
  listSiteFiles,
  ORIGIN,
  readJsonFile,
  readSiteFile,
  resolveSitePath
} from '@/tests/helpers/site';

import type { TPageData } from '@/types/pageData';

/**
 * `sitemap.xml` and `robots.txt` of the build agree with the pages that were
 * built: every listed address is a page that names itself as canonical.
 */

const IS_PRODUCTION = process.env.NEXT_PUBLIC_ENV === 'production';

const sitemap = readSiteFile('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
const robots = readSiteFile('robots.txt');

const readCanonical = (file: string) =>
  /<link rel="canonical" href="([^"]*)"/.exec(readSiteFile(file))?.[1] ?? null;

describe('sitemap.xml', () => {
  it('lists each address once, all on this site', () => {
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((url) => !url.startsWith(`${ORIGIN}/`))).toEqual([]);
    expect(urls.filter((url, index) => urls.indexOf(url) !== index)).toEqual([]);
  });

  it('lists only built pages that name the same address as canonical', () => {
    const problems = urls.flatMap((url) => {
      const file = resolveSitePath(new URL(url).pathname);
      if (!file) return [`${url}: no page`];

      const canonical = readCanonical(file);
      return canonical === url ? [] : [`${url}: canonical "${canonical}"`];
    });

    expect(problems).toEqual([]);
  });

  it('lists every built app page of the visible books, except search', () => {
    const books = getBooksMap();
    const expected = getBookIds()
      .filter((bookId) => !books[bookId].hidden)
      .flatMap((bookId) => listSiteFiles(`data/${bookId}`))
      .filter((file) => !file.endsWith('/bundle.json'))
      .map((file) => readJsonFile<TPageData>(file))
      .filter((page) => page.kind !== 'search')
      .map((page) => ORIGIN + getRoutePath(page.route));

    expect([...urls].sort()).toEqual(expected.sort());
  });

  it('lists no page of a hidden book', () => {
    const hidden = getBookIds().filter((bookId) => getBooksMap()[bookId].hidden);

    expect(urls.filter((url) => hidden.some((bookId) => url.startsWith(`${ORIGIN}/${bookId}/`)))).toEqual([]);
  });
});

describe('robots.txt', () => {
  const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((match) => match[1]);
  const isDisallowed = (path: string) =>
    disallowed.some((rule) => new RegExp(`^${rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}`).test(path));

  it('points to the sitemap of the build', () => {
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  it(IS_PRODUCTION ? 'lets crawlers read every sitemap address, not the data files and the shell' : 'closes the whole site', () => {
    if (!IS_PRODUCTION) {
      expect(disallowed).toEqual(['/']);
      return;
    }

    expect(urls.filter((url) => isDisallowed(new URL(url).pathname))).toEqual([]);
    expect(isDisallowed('/data/en/index.json')).toBe(true);
    expect(isDisallowed('/shell/')).toBe(true);
  });
});
