import { afterAll, describe, expect, it, vi } from 'vitest';

import { itemRoute } from '@/lib/pageData/routes/item';
import LdJsonPage from '@/other/metadata/LdJsonPage';
import LdJsonSong from '@/other/metadata/LdJsonSong';
import { getBookIds, getBooksMap, getItems } from '@/tests/helpers/books';
import { findBook, findSong } from '@/tests/helpers/cases';
import { loadPage, loadSongPage } from '@/tests/helpers/pageData';

import type { ReactElement } from 'react';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

describe('itemRoute', () => {
  it.each(getBookIds())('lists every contents item of %s once', (bookId) => {
    const slugs = [...new Set(getItems(bookId).map((item) => item.id))];

    expect(itemRoute.list(bookId)).toEqual(slugs.map((slug) => ({ kind: 'item', bookId, slug })));
  });

  it('loads a song as a `song` page with the metadata of the song', async () => {
    const { bookId, slug } = findSong('in-several-books');
    const loaded = await itemRoute.load({ kind: 'item', bookId, slug }, getBooksMap()[bookId]);

    expect(loaded.kind).toBe('song');
    expect(loaded.meta).toEqual(await itemRoute.meta({ kind: 'item', bookId, slug }));
  });

  it('loads a markdown page as a `page` page with the metadata of the page', async () => {
    const bookId = findBook('markdown-pages');
    const { id: slug } = getItems(bookId).find((item) => item.type === 'page');
    const loaded = await itemRoute.load({ kind: 'item', bookId, slug }, getBooksMap()[bookId]);

    expect(loaded.kind).toBe('page');
    expect(loaded.meta).toEqual(await itemRoute.meta({ kind: 'item', bookId, slug }));
  });

  it('has no page for a slug that is not in the contents', async () => {
    const [bookId] = getBookIds();
    const route = { kind: 'item', bookId, slug: 'no-such-item' } as const;

    expect(await itemRoute.load(route, getBooksMap()[bookId])).toBeNull();
  });

  it('gives a song the JSON-LD of songs', async () => {
    const page = await loadSongPage('in-several-books');
    const element = itemRoute.jsonLd(page) as ReactElement<{ slug: string }>;

    expect(element.type).toBe(LdJsonSong);
    expect(element.props.slug).toBe(page.route.slug);
  });

  it('gives a markdown page the JSON-LD of pages', async () => {
    const bookId = findBook('markdown-pages');
    const { id: slug } = getItems(bookId).find((item) => item.type === 'page');
    const page = await loadPage({ kind: 'item', bookId, slug }, 'page');
    const element = itemRoute.jsonLd(page) as ReactElement<{ title: string }>;

    expect(element.type).toBe(LdJsonPage);
    expect(element.props.title).toBe(page.data.page.meta.title);
  });
});
