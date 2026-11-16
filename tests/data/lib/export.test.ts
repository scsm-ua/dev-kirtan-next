import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildExportHtml } from '@/lib/export';
import { getBookLocale } from '@/other/helpers';
import { getBookIds, getBooksMap, getItems, getSongItems } from '@/tests/helpers/books';

import type { TExportDoc } from '@/lib/export';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const matches = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].map((match) => match[1]);

describe.each(getBookIds())('buildExportHtml of %s', (bookId) => {
  const items = getItems(bookId);
  const slugs = [...new Set(items.map((item) => item.id))];
  let doc: TExportDoc;
  let body: string;

  beforeAll(async () => {
    doc = await buildExportHtml(bookId);
    body = doc.body;
  });

  it('builds the document of the book', () => {
    expect(doc.title).toBe(getBooksMap()[bookId].title);
    expect(doc.lang).toBe(getBookLocale(bookId));
    expect(body.startsWith('<h1 class="book-title">')).toBe(true);
  });

  it('has the contents, one section per item and the first-lines index', () => {
    const ids = matches(body, /\sid="([^"]+)"/g);

    expect(ids.sort()).toEqual(['toc', 'first-lines', ...slugs.map((slug) => `song-${slug}`)].sort());
    expect(matches(body, /<p class="(toc-item)[ "]/g)).toHaveLength(items.length);
  });

  it('links only to places inside the document', () => {
    const ids = new Set(matches(body, /\sid="([^"]+)"/g));
    const broken = matches(body, /href="#([^"]*)"/g).filter((id) => !ids.has(id));

    expect([...new Set(broken)]).toEqual([]);
  });

  it('marks the songs that have no translation', () => {
    const untranslated = getSongItems(bookId)
      .filter((item) => !item.has.translation)
      .map((item) => item.id);
    const marked = matches(body, /<section class="song" id="song-([^"]+)" data-translated="0">/g);

    expect(marked.sort()).toEqual(untranslated.sort());
  });
});
