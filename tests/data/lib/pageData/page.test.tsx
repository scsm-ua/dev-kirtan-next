import { afterAll, describe, expect, it, vi } from 'vitest';

import AppDocument from '@/components/app/AppDocument';
import { getSingers } from '@/lib/audio';
import { loadPageData } from '@/lib/pageData';
import { definePage } from '@/lib/pageData/page';
import { getAudioSingerPageMeta } from '@/other/metadata/getAudioPageMeta';
import { getContentsPageMeta } from '@/other/metadata/getContentsPageMeta';
import LdJson from '@/other/metadata/LdJson';
import { getBookIds, getItems } from '@/tests/helpers/books';

import type { ReactElement } from 'react';
import type { TPageData } from '@/types/pageData';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const [SOME_BOOK] = getBookIds();
const AUDIO_BOOK = getBookIds().find((bookId) => getSingers(bookId).length > 0);

describe('definePage', () => {
  it('lists the params of every book when Next gives no parent params', () => {
    expect(definePage('contents').generateStaticParams()).toEqual(getBookIds().map((bookId) => ({ bookId })));
  });

  it('lists only the pages of the book of the parent params', () => {
    const slugs = [...new Set(getItems(SOME_BOOK).map((item) => item.id))];
    const params = { bookId: SOME_BOOK };

    expect(definePage('contents').generateStaticParams({ params })).toEqual([params]);
    expect(definePage('item').generateStaticParams({ params })).toEqual(
      slugs.map((slug) => ({ bookId: SOME_BOOK, slug }))
    );
    expect(definePage('audio-singer').generateStaticParams({ params: { bookId: AUDIO_BOOK } })).toEqual(
      getSingers(AUDIO_BOOK).map((singer) => ({ bookId: AUDIO_BOOK, singerId: singer.id }))
    );
  });

  it('takes the metadata from the route object', async () => {
    const [singer] = getSingers(AUDIO_BOOK);
    const contents = Promise.resolve({ bookId: SOME_BOOK });
    const ofSinger = Promise.resolve({ bookId: AUDIO_BOOK, singerId: singer.id });

    expect(await definePage('contents').generateMetadata({ params: contents })).toEqual(
      await getContentsPageMeta({ params: contents })
    );
    expect(await definePage('audio-singer').generateMetadata({ params: ofSinger })).toEqual(
      await getAudioSingerPageMeta({ params: ofSinger })
    );
  });

  it('renders the document from the page data of the route, with its JSON-LD', async () => {
    const element = (await definePage('contents').Page({
      params: Promise.resolve({ bookId: SOME_BOOK })
    })) as ReactElement<{ extras: ReactElement<{ pageKey: string }>; page: TPageData }>;

    expect(element.type).toBe(AppDocument);
    expect(element.props.page).toEqual(await loadPageData({ kind: 'contents', bookId: SOME_BOOK }));
    expect(element.props.extras.type).toBe(LdJson);
    expect(element.props.extras.props.pageKey).toBe('CONTENTS_PAGE');
  });

  it('renders a page without JSON-LD when the route object has none', async () => {
    const element = (await definePage('search').Page({
      params: Promise.resolve({ bookId: SOME_BOOK })
    })) as ReactElement<{ extras?: unknown }>;

    expect(element.props.extras).toBeUndefined();
  });

  it('answers not found for a route without a page', async () => {
    const params = Promise.resolve({ bookId: SOME_BOOK, slug: 'no-such-item' });

    await expect(definePage('item').Page({ params })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  });
});
