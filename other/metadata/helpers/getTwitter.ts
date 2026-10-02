import { Twitter } from 'next/dist/lib/metadata/types/twitter-types';

/**
 * No image is set here on purpose: Next.js auto-inherits `twitter.images`
 * from `openGraph.images` when twitter has no `images` key (see
 * postProcessMetadata in next/dist/lib/metadata/resolve-metadata.js), so the
 * og:image set (banner + optional song image) is mirrored into the twitter tags.
 */
export function getTwitter(
  bookId: string,
  description: string,
  title: string
): Partial<Twitter> {
  return {
    title: title,
    card: 'summary',
    description: description
  } as any;
}
