import type { Metadata } from 'next';

import { getPageMeta } from '@/other/metadata/helpers/getPageMeta';
import { getBookDescriptionById } from '@/lib/books';
import { getSingers, hasBookAudio, hasSinger } from '@/lib/audio';
import { getAudioSingerPage, SONGBOOK_PAGE } from '@/other/paths';
import { translate } from '@/other/i18n';
import type { BookListPageProps, SingerPageProps } from '@/types/book';

/**/
const MAX_DESCRIPTION_LENGTH = 160;

/**
 * `prefix: a, b, c…` cut at the last whole item that fits the snippet length.
 */
function listDescription(prefix: string, items: Array<string>): string {
  let text = prefix;

  for (let i = 0; i < items.length; i++) {
    const next = text + (i === 0 ? ': ' : ', ') + items[i];
    if (next.length > MAX_DESCRIPTION_LENGTH - 1) return text + '…';
    text = next;
  }

  return text;
}

/**/
function withDescription(meta: Partial<Metadata>, description: string): Partial<Metadata> {
  return {
    ...meta,
    description,
    openGraph: { ...meta.openGraph, description },
    twitter: { ...meta.twitter, description }
  };
}

/**/
export async function getAudioPageMeta({
  params
}: BookListPageProps): Promise<Partial<Metadata>> {
  const { bookId } = await params;
  const book = getBookDescriptionById(bookId);
  const meta = getPageMeta({
    bookId,
    descriptionKey: 'AUDIO_PAGE.SCHEMA.DESCRIPTION',
    page: SONGBOOK_PAGE.AUDIO,
    title: `${translate(bookId, 'AUDIO_PAGE.LINK_FULL_TITLE')} – ${book.title_full_short || book.title}`,
    hasPage: hasBookAudio
  });

  if (!hasBookAudio(bookId)) return meta;

  return withDescription(
    meta,
    listDescription(
      translate(bookId, 'AUDIO_PAGE.SCHEMA.DESCRIPTION').replace(/\.$/, ''),
      getSingers(bookId).map((singer) => singer.name)
    )
  );
}

/**/
export async function getAudioSingerPageMeta({
  params
}: SingerPageProps): Promise<Partial<Metadata>> {
  const { bookId, singerId } = await params;
  const book = getBookDescriptionById(bookId);
  const singer = getSingers(bookId).find((s) => s.id === singerId);
  const meta = getPageMeta({
    bookId,
    descriptionKey: 'AUDIO_PAGE.SCHEMA.DESCRIPTION',
    page: getAudioSingerPage(singerId),
    title: singer && `${singer.name} – ${book.title_full_short || book.title}`,
    hasPage: (id: string) => hasSinger(id, singerId)
  });

  if (!singer) return meta;

  return withDescription(
    meta,
    `${singer.name} – ${translate(bookId, 'AUDIO_PAGE.SCHEMA.DESCRIPTION')}`
  );
}
