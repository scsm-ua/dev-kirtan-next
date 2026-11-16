import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { listRoutes, loadPageData } from '@/lib/pageData';
import { getRoutePath } from '@/other/router/routes';
import { collectReactErrors, renderApp, stubBrowserApis } from '@/tests/helpers/app';
import { getBookIds } from '@/tests/helpers/books';

import type { TPageData } from '@/types/pageData';

/**
 * Rules for the rendered view of every page of every book: the whole client
 * app is rendered from the page data of each route, as the browser does.
 */

// As in `next build`: lib/ caches the book files, which makes the sweep 10× faster.
// React is already loaded here (imports run first), so it stays in development mode.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

/** Paths of every app page of every book: where an internal link may lead. */
const appPaths = new Set(getBookIds().flatMap((bookId) => listRoutes(bookId).map(getRoutePath)));

type TReport = {
  pageCount: number;
  // Author links with a `#section-…` anchor that the anchor rule looked at.
  authorAnchorCount: number;
  reactErrors: string[];
  emptyViews: string[];
  landmarks: string[];
  headings: string[];
  duplicateIds: string[];
  brokenLinks: string[];
  missingAnchors: string[];
  unnamedControls: string[];
  imagesWithoutAlt: string[];
};

/** Ids on the authors page of a book: targets of the author links of its songs. */
const authorSections = new Map<string, Set<string>>();

/** Per book: how many author links with an anchor were checked. Filled as the books are swept. */
const authorAnchorCounts = new Map<string, number>();

/** Same-origin links of the document as `[path, hash]`. */
function getInternalLinks(): Array<[string, string]> {
  return [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .map((link) => new URL(link.getAttribute('href'), window.location.href))
    .filter((url) => url.origin === window.location.origin)
    .map((url) => [url.pathname, decodeURIComponent(url.hash.slice(1))]);
}

/** What a screen reader calls a link or a button: its label, its text, the alt of its images or its title. */
function getName(el: Element): string {
  const alts = [...el.querySelectorAll('img[alt]')].map((img) => img.getAttribute('alt'));
  return [el.getAttribute('aria-label'), el.textContent, ...alts, el.getAttribute('title')].join(' ').trim();
}

/**
 * Open finding T8 (.github/plans/plan-tests.md): contents groups that share a
 * name get the same `section-<name>` id. Not decided yet whether the content
 * or the id scheme changes, so exactly these ids are left out of the rule.
 */
function getOpenDuplicateIds(page: TPageData): Set<string> {
  if (page.kind !== 'contents') return new Set();

  const names = page.data.groups.map((group) => group.name).filter(Boolean);
  return new Set(names.filter((name, index) => names.indexOf(name) !== index).map((name) => `section-${name}`));
}

/** Renders one page and adds what breaks a rule to the report. */
function inspectView(page: TPageData, report: TReport): void {
  const path = getRoutePath(page.route);
  const { bookId } = page.route;
  const { errors, restore } = collectReactErrors();
  const view = renderApp(page);

  const add = (rule: Exclude<keyof TReport, 'pageCount' | 'authorAnchorCount'>, problems: string[]) =>
    report[rule].push(...[...new Set(problems)].map((problem) => `${path}: ${problem}`));

  const main = document.querySelector('main.Main');
  if (!main?.textContent.trim()) add('emptyViews', ['nothing in <main>']);
  const mainCount = document.querySelectorAll('main').length;
  if (mainCount > 1) add('landmarks', [`${mainCount} <main>`]);

  const h1 = document.querySelectorAll('h1');
  if (h1.length > 1) add('headings', [`${h1.length} <h1>`]);
  if ([...h1].some((heading) => !heading.textContent.trim())) add('headings', ['empty <h1>']);

  const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
  const openDuplicates = getOpenDuplicateIds(page);
  add('duplicateIds', ids.filter((id, index) => ids.indexOf(id) !== index && !openDuplicates.has(id)));
  if (page.kind === 'authors') authorSections.set(bookId, new Set(ids));

  const links = getInternalLinks();
  add(
    'brokenLinks',
    links.filter(([linkPath]) => !appPaths.has(linkPath)).map(([linkPath]) => linkPath)
  );
  const authorAnchors = links.filter(([linkPath, hash]) => hash && linkPath === `/${bookId}/authors/`);
  report.authorAnchorCount += authorAnchors.length;
  add(
    'missingAnchors',
    authorAnchors.filter(([, hash]) => !authorSections.get(bookId)?.has(hash)).map(([, hash]) => `#${hash}`)
  );

  add(
    'unnamedControls',
    [...document.querySelectorAll('a[href], button')]
      .filter((el) => !el.closest('[aria-hidden="true"]') && !getName(el))
      .map((el) => `<${el.tagName.toLowerCase()} class="${el.className}">`)
  );
  add(
    'imagesWithoutAlt',
    [...document.querySelectorAll('img:not([alt])')].map((img) => img.getAttribute('src'))
  );

  view.unmount();
  restore();
  add('reactErrors', errors);
}

beforeEach(() => stubBrowserApis());
afterEach(() => vi.unstubAllGlobals());

describe.each(getBookIds())('views of %s', (bookId) => {
  const report: TReport = {
    pageCount: 0,
    authorAnchorCount: 0,
    reactErrors: [],
    emptyViews: [],
    landmarks: [],
    headings: [],
    duplicateIds: [],
    brokenLinks: [],
    missingAnchors: [],
    unnamedControls: [],
    imagesWithoutAlt: []
  };

  beforeAll(async () => {
    stubBrowserApis();
    // The authors page goes first: song pages link to its sections.
    const routes = listRoutes(bookId).sort((a, b) => Number(b.kind === 'authors') - Number(a.kind === 'authors'));

    for (const route of routes) {
      inspectView(await loadPageData(route), report);
      report.pageCount++;
    }
    authorAnchorCounts.set(bookId, report.authorAnchorCount);
    // The biggest books take several seconds, more with coverage or on a CI runner.
  }, 120_000);

  it('renders every page of the book', () => {
    expect(report.pageCount).toBe(listRoutes(bookId).length);
    expect(report.emptyViews).toEqual([]);
  });

  it('renders without React errors', () => {
    expect(report.reactErrors).toEqual([]);
  });

  it('has one <main> on a page', () => {
    expect(report.landmarks).toEqual([]);
  });

  it('has at most one <h1> on a page, and never an empty one', () => {
    expect(report.headings).toEqual([]);
  });

  it('has no element id twice on a page (same-named contents groups aside, T8)', () => {
    expect(report.duplicateIds).toEqual([]);
  });

  it('links only to pages that exist', () => {
    expect(report.brokenLinks).toEqual([]);
  });

  it('links an author to a section the authors page has', ({ skip }) => {
    // A book whose songs render no author link with an anchor has nothing to check: skipped, not passed.
    if (!report.authorAnchorCount) skip('no author link with an anchor in this book');

    expect(report.missingAnchors).toEqual([]);
  });

  it('gives every link and button a name', () => {
    expect(report.unnamedControls).toEqual([]);
  });

  it('gives every image an alt attribute', () => {
    expect(report.imagesWithoutAlt).toEqual([]);
  });
});

// Runs after the sweeps above (same file, in order).
describe('the author anchor rule', () => {
  it('had author links with an anchor to check in some book', () => {
    const checked = [...authorAnchorCounts.values()].reduce((sum, count) => sum + count, 0);

    expect(authorAnchorCounts.size).toBe(getBookIds().length);
    expect(checked).toBeGreaterThan(0);
  });
});
