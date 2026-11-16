import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPageBySlug } from '@/lib/page';
import { BOOKS_DIR, getItems, readJson } from '@/tests/helpers/books';
import { findBook } from '@/tests/helpers/cases';

describe('getPageBySlug', () => {
  const bookId = findBook('markdown-pages');

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads every markdown page of the book', async () => {
    const slugs = getItems(bookId)
      .filter((item) => item.type === 'page')
      .map((item) => item.id);

    for (const slug of slugs) {
      const page = await getPageBySlug(slug, bookId);

      expect(page, slug).toEqual(readJson(BOOKS_DIR, bookId, 'pages', `${slug}.json`));
      expect(page.meta.title, slug).toBeTruthy();
      expect(page.body, slug).toBeTruthy();
    }
  });

  it('reports a missing page and returns null', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await getPageBySlug('no-such-page', bookId)).toBeNull();
    expect(error).toHaveBeenCalledOnce();
  });
});
