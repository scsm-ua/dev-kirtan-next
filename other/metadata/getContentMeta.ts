import type { Metadata } from 'next';

import { getContentHandler } from '@/lib/content/registry';
import { getContentItemBySlug } from '@/lib/contents';

import type { ContentPageProps } from '@/types/book';

/**
 * `generateMetadata` for the shared content route. Dispatches to the item
 * type's handler (`getMeta`), mirroring the render dispatch in the route.
 */
export async function getContentMeta({
  params
}: ContentPageProps): Promise<Partial<Metadata>> {
  const { bookId, slug } = await params;
  if (!bookId || !slug) return null;

  const item = await getContentItemBySlug(bookId, slug);
  const handler = getContentHandler(item?.type);

  const data = await handler.load(slug, bookId);
  if (!data) return null;

  return handler.getMeta(data, { bookId, slug });
}
