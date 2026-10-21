import { TSong } from '@/types/song';

/**
 * Builds the song title string. With `withSubtitle` / `withAuthor` (both
 * default on) those parts are appended; drop one for the `<title>` tag to
 * avoid SERP truncation.
 */
export function getSongPageTitle(song: TSong, withSubtitle = true, withAuthor = true): string {
  let title = song.title.join(' ');

  if (withAuthor && song.author?.length > 0) {
    title += '. ' + song.author[0];
  }

  if (withSubtitle && song.subtitle?.length > 0) {
    title += '. ' + song.subtitle.join(' ');
  }

  return title;
}
