import { createElement } from 'react';
import { notFound } from 'next/navigation';
import './ContentPage.scss';

import { getBooksMap } from '@/lib/books';
import { getContentBody } from '@/components/content/registry';
import { getContentHandler } from '@/lib/content/registry';
import { getContentItemBySlug } from '@/lib/contents';
import { getNavItems, getSongSlugParam } from '@/lib/song';
import { getContentMeta } from '@/other/metadata/getContentMeta';

import type { ContentPageProps } from '@/types/book';

/**/
export const dynamicParams = false;
export const generateMetadata = getContentMeta;
export const generateStaticParams = getSongSlugParam;

/**
 * Shared route for all content item types (songs, markdown pages). The item's
 * `type` (derived at import stage) picks the handler; the handler loads the
 * data and renders its body inside the shared chrome (`ContentShell`).
 */
async function ContentPage({ params }: ContentPageProps) {
  const { bookId, slug } = await params;
  if (!bookId || !slug) return notFound();

  const item = getContentItemBySlug(bookId, slug);
  const handler = getContentHandler(item?.type);

  const data = await handler.load(slug, bookId);
  if (!data) return notFound();

  const booksMap = getBooksMap();
  const book = booksMap[bookId];
  const nav = await getNavItems(slug, bookId);

  // createElement: dynamic per-type dispatch (server component, no state).
  return createElement(getContentBody(item?.type), {
    book,
    bookId,
    data,
    nav,
    slug
  });
}

/**/
export default ContentPage;
