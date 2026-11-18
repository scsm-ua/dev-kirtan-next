import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { getBookIds, getBooksMap } from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';
import { getSongbookPath } from '@/other/paths';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('songbook indexing', () => {
  it('omits hidden books and includes visible books in the sitemap', async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    for (const bookId of getBookIds()) {
      const prefix = getSongbookPath(bookId);
      expect(paths.some((path) => path.startsWith(prefix)), bookId)
        .toBe(!getBooksMap()[bookId].hidden);
    }
  });

  it('disallows every hidden book in production', () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', 'production');
    const { rules } = robots();

    expect(rules).toMatchObject({
      userAgent: '*',
      allow: '/',
      disallow: [
        '/*/search/', '/data/', '/shell/',
        ...getBookIds().filter((id) => getBooksMap()[id].hidden).map(getSongbookPath)
      ]
    });
  });

  it('keeps the entire non-production site disallowed', () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', 'test');
    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' });
  });

  it.each(['production', 'test'])('sets indexing for all metadata builders in %s', async (env) => {
    vi.stubEnv('NEXT_PUBLIC_ENV', env);
    const { getPageMeta } = await import('@/other/metadata/helpers/getPageMeta');
    const { getSongMeta } = await import('@/lib/content/song/meta');
    const { getPageMeta: getMarkdownMeta } = await import('@/lib/content/page/meta');
    const { songHandler } = await import('@/lib/content/song');
    const fixture = findSong('in-several-books');
    const song = await songHandler.load(fixture.slug, fixture.bookId);

    for (const bookId of getBookIds()) {
      const ctx = { bookId, slug: 'about' };
      const metas = [
        getPageMeta({ bookId, descriptionKey: 'CONTENTS_PAGE.HEAD.DESCRIPTION' }),
        await getSongMeta(song, ctx),
        getMarkdownMeta({ meta: { title: 'About' }, body: 'text' }, ctx)
      ];
      const index = env === 'production' && !getBooksMap()[bookId].hidden;

      for (const meta of metas) {
        expect(meta.robots, bookId).toMatchObject({ index, googleBot: { index } });
      }
    }
  });
});