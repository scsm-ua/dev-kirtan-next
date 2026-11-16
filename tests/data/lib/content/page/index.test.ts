import { afterEach, describe, expect, it, vi } from 'vitest';

import { pageHandler } from '@/lib/content/page';
import resourcesConfig from '@/source/resources.json';
import { getItems } from '@/tests/helpers/books';
import { findBook } from '@/tests/helpers/cases';

const REPO_PATH = resourcesConfig.resources.replace(/^git\+https:\/\/github\.com\//, '').replace(/\.git.*$/, '');
const RELATIVE_MD_LINK = /\]\((?:\.{1,2}\/)?(?:(?:songs|pages)\/)?[\w-]+\.md\)/;
const SONG_REF = /class="song-ref" href="\/([^/"]+)\/([^/"]+)\/"/g;

describe('pageHandler.load', () => {
  const bookId = findBook('markdown-pages');
  const items = getItems(bookId);
  const pageSlugs = items.filter((item) => item.type === 'page').map((item) => item.id);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads every markdown page of the book', async () => {
    for (const slug of pageSlugs) {
      const page = await pageHandler.load(slug, bookId);

      expect(page?.meta.title, slug).toBeTruthy();
      expect(page.body, slug).toBeTruthy();
    }
  });

  it('leaves no links to source files or to images in the resources repository', async () => {
    const problems: string[] = [];

    for (const slug of pageSlugs) {
      const { body } = await pageHandler.load(slug, bookId);

      if (RELATIVE_MD_LINK.test(body)) problems.push(`${bookId}/${slug}: a link to a .md file`);
      if (body.includes(`${REPO_PATH}/`) && /\/images\//.test(body)) {
        problems.push(`${bookId}/${slug}: an image in the resources repository`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('links song references only to items of the same book', async () => {
    const slugs = new Set(items.map((item) => item.id));
    const problems: string[] = [];

    for (const slug of pageSlugs) {
      const { body } = await pageHandler.load(slug, bookId);

      for (const [, refBook, refSlug] of body.matchAll(SONG_REF)) {
        if (refBook !== bookId || !slugs.has(refSlug)) problems.push(`${bookId}/${slug}: /${refBook}/${refSlug}/`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('reports a missing page and returns null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await pageHandler.load('no-such-page', bookId)).toBeNull();
  });
});
