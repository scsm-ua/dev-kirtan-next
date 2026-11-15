import { notFound } from 'next/navigation';

import AppDocument from '@/components/app/AppDocument';
import { getContentMeta } from '@/other/metadata/getContentMeta';
import { getSongSlugParam } from '@/lib/song';
import { loadPageData } from '@/lib/pageData';
import LdJsonSong from '@/other/metadata/LdJsonSong';

import type { ContentPageProps } from '@/types/book';

/**/
export const dynamicParams = false;
export const generateMetadata = getContentMeta;
export const generateStaticParams = getSongSlugParam;

/**
 * Shared route for all content item types (songs, markdown pages). The page
 * data carries the item's kind; the client app picks the matching view.
 */
async function ContentPage({ params }: ContentPageProps) {
  const { bookId, slug } = await params;
  if (!bookId || !slug) return notFound();

  const page = await loadPageData({ kind: 'item', bookId, slug });
  if (!page) return notFound();

  const extras = page.kind === 'song' ? (
    <LdJsonSong
      bookDescriptions={page.data.descriptions}
      bookId={bookId}
      bookTitle={page.data.book.title}
      slug={slug}
      song={page.data.song}
    />
  ) : undefined;

  return <AppDocument extras={extras} page={page} />;
}

/**/
export default ContentPage;
