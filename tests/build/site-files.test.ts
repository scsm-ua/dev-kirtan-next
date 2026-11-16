import { describe, expect, it } from 'vitest';

import { getRoutePath } from '@/other/router/routes';
import { getBookIds } from '@/tests/helpers/books';
import {
  getHtmlFile,
  listSiteFiles,
  readHtmlPageData,
  readJsonFile,
  readSiteFile,
  resolveSitePath
} from '@/tests/helpers/site';

import type { TPageData } from '@/types/pageData';

/**
 * Files of the build outside the app pages: the offline shell, 404, the
 * service worker, the manifest and the full-load pages of every book.
 */

const readRobots = (file: string) => /<meta name="robots" content="([^"]*)"/.exec(readSiteFile(file))?.[1] ?? '';
const readStylesheets = (file: string) =>
  [...readSiteFile(file).matchAll(/<link rel="stylesheet" href="([^"]*)"/g)].map((match) => match[1]);

describe('files of the build', () => {
  it('has the service worker and turns off Jekyll on GitHub Pages', () => {
    expect(resolveSitePath('/sw.js')).not.toBeNull();
    expect(resolveSitePath('/.nojekyll')).not.toBeNull();
  });

  it('has a manifest whose start address and icons exist', () => {
    const manifest = readJsonFile<{ start_url: string; icons: Array<{ src: string }> }>('manifest.json');

    expect(manifest.icons.length).toBeGreaterThan(0);
    expect([manifest.start_url, ...manifest.icons.map((icon) => icon.src)].filter((src) => !resolveSitePath(src))).toEqual([]);
  });

  it('has an offline shell: the app with no page data, not indexed', () => {
    const html = readSiteFile('shell/index.html');

    expect(readHtmlPageData(html)).toBeNull();
    expect(readRobots('shell/index.html')).toContain('noindex');
  });

  it('has a 404 page that is not indexed', () => {
    expect(readRobots('404.html')).toContain('noindex');
  });
});

describe.each(getBookIds())('full-load pages of %s', (bookId) => {
  it('has the analyze and export pages, not indexed', () => {
    expect(readRobots(`${bookId}/analyze/index.html`)).toContain('noindex');
    expect(readRobots(`${bookId}/export/index.html`)).toContain('noindex');
  });

  it('keeps the app styles out of the export page', () => {
    const song = listSiteFiles(`data/${bookId}`)
      .filter((file) => !file.endsWith('/bundle.json'))
      .map((file) => readJsonFile<TPageData>(file))
      .find((page) => page.kind === 'song');
    const everyPage = new Set(readStylesheets('index.html'));
    const appStyles = readStylesheets(getHtmlFile(getRoutePath(song.route))).filter((href) => !everyPage.has(href));

    expect(appStyles.length).toBeGreaterThan(0);
    expect(readStylesheets(`${bookId}/export/index.html`).filter((href) => appStyles.includes(href))).toEqual([]);
  });
});
