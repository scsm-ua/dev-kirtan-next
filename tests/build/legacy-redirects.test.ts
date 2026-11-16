import { describe, expect, it } from 'vitest';

import { getBookIds, getItems } from '@/tests/helpers/books';
import { listSiteFiles, ORIGIN, readSiteFile, resolveSitePath } from '@/tests/helpers/site';

/**
 * `/<book>/<slug>.html` addresses of the old site redirect to the page of
 * the same item (written by `scripts/postbuild.js`).
 */

describe.each(getBookIds())('legacy .html addresses of %s', (bookId) => {
  const slugs = [...new Set(getItems(bookId).map((item) => item.id))].filter((slug) => !slug.includes('/'));
  const files = listSiteFiles(bookId).filter(
    (file) => /^[^/]+\/[^/]+\.html$/.test(file) && file !== `${bookId}/index.html`
  );

  it('exist for every contents item and for nothing else', () => {
    expect(files.sort()).toEqual(slugs.map((slug) => `${bookId}/${slug}.html`).sort());
  });

  it('send the browser and crawlers to the built page of the item', () => {
    const problems = slugs.flatMap((slug) => {
      const target = `${ORIGIN}/${bookId}/${slug}/`;
      const html = readSiteFile(`${bookId}/${slug}.html`);
      const script = /location\.replace\(("[^"]*")\)/.exec(html)?.[1];
      const found = [
        /<link rel="canonical" href="([^"]*)">/.exec(html)?.[1],
        /<meta http-equiv="refresh" content="0; url=([^"]*)">/.exec(html)?.[1],
        script && JSON.parse(script)
      ];

      if (found.some((url) => url !== target)) return [`${slug}.html: ${JSON.stringify(found)}`];
      return resolveSitePath(`/${bookId}/${slug}/`) ? [] : [`${slug}.html: no page at ${target}`];
    });

    expect(problems).toEqual([]);
  });
});
