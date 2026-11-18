import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from '@/app/robots';
import { getSongbookPath } from '@/other/paths';
import { getBooksMap } from '@/tests/helpers/books';

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN;

describe('robots', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('closes the whole site outside production', () => {
    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' });
  });

  it('opens the production site, except search, app data, the shell and hidden books', () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', 'production');

    const hiddenBookPaths = Object.entries(getBooksMap())
      .filter(([, book]) => book.hidden)
      .map(([bookId]) => getSongbookPath(bookId));

    expect(robots().rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/*/search/', '/data/', '/shell/', ...hiddenBookPaths]
    });
  });

  it('points to the sitemap of this site', () => {
    expect(robots().sitemap).toBe(`${ORIGIN}sitemap.xml`);
  });
});
