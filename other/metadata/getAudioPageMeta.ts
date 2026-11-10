import type { Metadata } from 'next';

import { getPageMeta } from '@/other/metadata/helpers/getPageMeta';
import { getBookDescriptionById } from '@/lib/books';
import { getSingers, hasBookAudio, hasSinger } from '@/lib/audio';
import { getAudioSingerPage, SONGBOOK_PAGE } from '@/other/paths';
import type { BookListPageProps, SingerPageProps } from '@/types/book';

/**/
export async function getAudioPageMeta({
  params
}: BookListPageProps): Promise<Partial<Metadata>> {
  const { bookId } = await params;

  return getPageMeta({
    bookId,
    descriptionKey: 'AUDIO_PAGE.HEAD.DESCRIPTION',
    page: SONGBOOK_PAGE.AUDIO,
    hasPage: hasBookAudio
  });
}

/**/
export async function getAudioSingerPageMeta({
  params
}: SingerPageProps): Promise<Partial<Metadata>> {
  const { bookId, singerId } = await params;
  const book = getBookDescriptionById(bookId);
  const singer = getSingers(bookId).find((s) => s.id === singerId);

  return getPageMeta({
    bookId,
    descriptionKey: 'AUDIO_PAGE.HEAD.DESCRIPTION',
    page: getAudioSingerPage(singerId),
    title: singer && `${singer.name} – ${book.title_full_short || book.title}`,
    hasPage: (id: string) => hasSinger(id, singerId)
  });
}
