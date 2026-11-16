import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';

import { getBookLocale } from '@/other/helpers';
import { getBookBundleUrl, getRoutePath } from '@/other/router/routes';
import { getBookIds } from '@/tests/helpers/books';
import { findBrokenReferences } from '@/tests/helpers/ldJson';
import {
  getHtmlFile,
  getSitePath,
  listSiteFiles,
  ORIGIN,
  readJsonFile,
  readSiteFile,
  resolveSitePath
} from '@/tests/helpers/site';

import type { TPageData } from '@/types/pageData';

/**
 * The static HTML of every app page, as crawlers and first visits get it:
 * head tags, headings and JSON-LD agree with the page data of the build.
 */

type TReport = {
  page: TPageData;
  path: string;
  lang: string;
  title: string;
  description: string;
  canonical: string;
  ogUrl: string;
  ogLocale: string;
  robots: string;
  h1: string[];
  ldJson: unknown[];
};

const IS_PRODUCTION = process.env.NEXT_PUBLIC_ENV === 'production';

const attr = (doc: Document, selector: string, name: string) =>
  doc.querySelector(selector)?.getAttribute(name) ?? '';

/** Facts of one page; the DOM is dropped right away, so all pages fit in memory. */
function readPage(page: TPageData): TReport {
  const path = getRoutePath(page.route);
  const { document: doc } = new JSDOM(readSiteFile(getHtmlFile(path))).window;

  return {
    page,
    path,
    lang: doc.documentElement.lang,
    // Not `doc.title`: it collapses white space, `applyHead` sets the raw text.
    title: doc.querySelector('title')?.textContent ?? '',
    description: attr(doc, 'meta[name="description"]', 'content'),
    canonical: attr(doc, 'link[rel="canonical"]', 'href'),
    ogUrl: attr(doc, 'meta[property="og:url"]', 'content'),
    ogLocale: attr(doc, 'meta[property="og:locale"]', 'content'),
    robots: attr(doc, 'meta[name="robots"]', 'content'),
    h1: [...doc.querySelectorAll('h1')].map((h1) => h1.textContent.trim()),
    ldJson: [...doc.querySelectorAll('script[type="application/ld+json"]')].map((script) => {
      try {
        return JSON.parse(script.textContent);
      } catch {
        return null;
      }
    })
  };
}

/** A JSON-LD node id defined by the JSON-LD of another built page. */
const isBuiltPageNode = (id: string) => {
  const sitePath = getSitePath(id, '/');
  return !!sitePath && !!resolveSitePath(sitePath);
};

describe.each(getBookIds())('HTML pages of %s', (bookId) => {
  let reports: TReport[];

  beforeAll(() => {
    reports = listSiteFiles(`data/${bookId}`)
      .filter((file) => `/${file}` !== getBookBundleUrl(bookId))
      .map((file) => readPage(readJsonFile<TPageData>(file)));
  });

  /** Runs `check` for every page; a returned text is a problem. */
  const checkPages = (check: (report: TReport) => string | false) => {
    const problems = reports.flatMap((report) => {
      const problem = check(report);
      return problem ? [`${report.path}: ${problem}`] : [];
    });

    expect(reports.length).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  };

  it('are in the language of the book', () => {
    const locale = getBookLocale(bookId);

    checkPages(({ lang, ogLocale }) => (lang !== locale || ogLocale !== locale) && `lang "${lang}", og:locale "${ogLocale}"`);
  });

  it('have the title and the description of their page data', () => {
    checkPages(({ page, title, description }) => {
      if (title !== page.head.title) return `title "${title}"`;
      return description !== page.head.description && `description "${description}"`;
    });
  });

  it('name their own address as canonical and og:url', () => {
    checkPages(({ page, canonical, ogUrl }) => {
      const expected = ORIGIN + page.head.canonical;
      return (canonical !== expected || ogUrl !== expected) && `canonical "${canonical}", og:url "${ogUrl}"`;
    });
  });

  it(`are ${IS_PRODUCTION ? '' : 'not '}indexed`, () => {
    const expected = IS_PRODUCTION ? 'index, follow' : 'noindex, nofollow';

    checkPages(({ robots }) => robots !== expected && `robots "${robots}"`);
  });

  it('have at most one h1, never empty; a song page has the song title in it', () => {
    const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

    checkPages(({ page, h1 }) => {
      if (h1.length > 1 || h1.some((text) => !text)) return `h1: ${JSON.stringify(h1)}`;
      if (page.kind !== 'song') return false;

      const title = squash(page.data.song.title[0]);
      return !squash(h1[0] ?? '').includes(title) && `h1 "${h1[0]}" does not have the title "${title}"`;
    });
  });

  it('have valid JSON-LD whose references point into the same graph or to a built page', () => {
    checkPages(({ page, ldJson }) => {
      if (page.kind === 'search') return ldJson.length > 0 && 'unexpected JSON-LD';
      if (!ldJson.length) return 'no JSON-LD';

      for (const json of ldJson as Array<{ '@context'?: string; '@graph'?: [] } | null>) {
        if (!json) return 'JSON-LD is not valid JSON';
        if (json['@context'] !== 'https://schema.org') return `@context "${json['@context']}"`;

        const broken = findBrokenReferences(json['@graph'] ?? [json], isBuiltPageNode);
        if (broken.length) return `broken references ${broken.join(', ')}`;
      }

      return false;
    });
  });
});
