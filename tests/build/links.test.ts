import { describe, expect, it } from 'vitest';

import { getSitePath, listSiteFiles, ORIGIN, readSiteFile, resolveSitePath } from '@/tests/helpers/site';

/**
 * Every address on this site that an HTML file of the build points to
 * (links, stylesheets, scripts, images, meta tags, redirects) is a file of
 * the build.
 */

const HTML_FILES = listSiteFiles().filter((file) => file.endsWith('.html'));

// React always writes double-quoted attributes; the RSC payload escapes its quotes.
const URL_ATTRIBUTES = /\s(?:href|src)="([^"]*)"|\scontent="(?:\d+;\s*url=)?([^"]*)"/g;

const decodeEntities = (value: string) =>
  value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** Page path of an HTML file, as the browser sees it (`en/x/index.html` → `/en/x/`). */
const getPagePath = (file: string) => `/${file.replace(/index\.html$/, '')}`;

describe('links in the HTML files of the build', () => {
  it('has the HTML files of all kinds', () => {
    expect(HTML_FILES).toEqual(
      expect.arrayContaining(['index.html', '404.html', 'shell/index.html', 'en/index.html', 'en/export/index.html'])
    );
  });

  it('point only to files that exist', () => {
    const broken = new Map<string, string>();

    for (const file of HTML_FILES) {
      const pagePath = getPagePath(file);

      for (const [, link, content] of readSiteFile(file).matchAll(URL_ATTRIBUTES)) {
        // Meta `content` is a URL only when it is an absolute address on this site.
        const value = decodeEntities(link ?? content);
        if (link === undefined && !value.startsWith(`${ORIGIN}/`)) continue;
        if (!value || value.startsWith('#')) continue;

        const sitePath = getSitePath(value, pagePath);
        if (sitePath && !resolveSitePath(sitePath) && !broken.has(sitePath)) broken.set(sitePath, file);
      }
    }

    expect([...broken].map(([target, file]) => `${target} (first in ${file})`)).toEqual([]);
  });
});
