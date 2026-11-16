import { beforeEach, describe, expect, it } from 'vitest';

import { applyHead } from '@/other/router/head';
import { getAbsoluteUrl } from '@/other/paths';
import { getBookLocale } from '@/other/helpers';
import { getBookIds } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

const [bookId] = getBookIds();

describe('applyHead', () => {
  beforeEach(() => {
    document.title = 'Old title';
    document.documentElement.lang = 'xx';
    document.head.innerHTML =
      '<meta name="description" content="Old description"><link rel="canonical" href="https://old.example/">';
  });

  it('brings the title, description, canonical and language in line with the page', async () => {
    const page = await loadPage({ kind: 'contents', bookId }, 'contents');

    applyHead(page);

    expect(document.title).toBe(page.head.title);
    expect(document.querySelector('meta[name="description"]').getAttribute('content')).toBe(page.head.description);
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(
      getAbsoluteUrl(`/${bookId}/contents/`)
    );
    expect(document.documentElement.lang).toBe(getBookLocale(bookId));
  });

  it('keeps the canonical when the page has none', async () => {
    const page = await loadPage({ kind: 'contents', bookId }, 'contents');

    applyHead({ ...page, head: { ...page.head, canonical: '' } });

    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://old.example/');
  });

  it('works in a document without the description and canonical elements', async () => {
    const page = await loadPage({ kind: 'contents', bookId }, 'contents');
    document.head.innerHTML = '';

    applyHead(page);

    expect(document.title).toBe(page.head.title);
  });
});
