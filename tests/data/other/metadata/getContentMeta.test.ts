import { afterEach, describe, expect, it, vi } from 'vitest';

import { getContentMeta } from '@/other/metadata/getContentMeta';
import { getSongPath } from '@/other/paths';
import { getBookIds, getItems } from '@/tests/helpers/books';
import { findBook, findSong } from '@/tests/helpers/cases';

const meta = (bookId: string, slug: string) => getContentMeta({ params: Promise.resolve({ bookId, slug }) });

describe('getContentMeta', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('describes a song', async () => {
    const { bookId, slug } = findSong('meta-author');
    const result = await meta(bookId, slug);

    expect(result.alternates.canonical).toBe(getSongPath(bookId, slug));
    expect(result.openGraph).toMatchObject({ type: 'music.song' });
  });

  it('describes a markdown page', async () => {
    const bookId = findBook('markdown-pages');
    const { id: slug } = getItems(bookId).find((item) => item.type === 'page');
    const result = await meta(bookId, slug);

    expect(result.alternates.canonical).toBe(getSongPath(bookId, slug));
    expect(result.openGraph).toMatchObject({ type: 'article' });
    expect(result.title).toBeTruthy();
  });

  it('returns null without a book or a slug', async () => {
    expect(await meta('', 'some-song')).toBeNull();
    expect(await meta(getBookIds()[0], '')).toBeNull();
  });

  it('returns null for an unknown item', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await meta(getBookIds()[0], 'no-such-item')).toBeNull();
  });
});
