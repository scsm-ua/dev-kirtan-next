import fs from 'node:fs';
import path from 'path';

import { getBookIdParamList } from '@/lib/books';
import { getContentsByBookId } from '@/lib/contents';
import { compareFirstLines } from '@/scripts/compareHelpers';
import { PATH } from '@/other/constants';
import { sortSingers } from '@/other/sortSingers';
import { ITEM_TYPE } from '@/types/common';

import type { TAudioTrack, TSinger } from '@/types/audio';
import type { TContentGroup, TContentItem } from '@/types/common';
import type { TAudio } from '@/types/resources';
import type { TSong } from '@/types/song';

/**/
type TSongAudioMap = Map<string, Array<TAudio>>;

/**
 * Per-build memo of song audio lists keyed by bookId. Disabled in dev so
 * source edits show up without a server restart.
 */
const cache = new Map<string, TSongAudioMap>();

/**
 * Audio lists of every song with audio in the book, keyed by song slug.
 */
function getSongAudioMap(bookId: string): TSongAudioMap {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && cache.has(bookId)) return cache.get(bookId);

  const map: TSongAudioMap = new Map();

  for (const item of getAllItems(getContentsByBookId(bookId))) {
    if (!isAudioSong(item) || map.has(item.id)) continue;

    const p = path.join(
      process.cwd(),
      PATH.DIR.SOURCE_BOOKS,
      bookId,
      PATH.DIR.SONGS,
      item.id + '.json'
    );
    const song = JSON.parse(fs.readFileSync(p, 'utf8')) as TSong;
    const audio = song.resources?.audio;
    if (audio?.length) map.set(item.id, audio);
  }

  if (isProd) cache.set(bookId, map);
  return map;
}

/**/
export function hasBookAudio(bookId: string): boolean {
  return getSongAudioMap(bookId).size > 0;
}

/**/
export function getAudioBookIdParamList(): Array<{ bookId: string }> {
  return getBookIdParamList().filter(({ bookId }) => hasBookAudio(bookId));
}

/**
 * Singers with their recording count. First-appearance order in contents,
 * with Dev-Goswami Maharajs moved to the front.
 */
export function getSingers(bookId: string): Array<TSinger> {
  const singers = new Map<string, TSinger>();

  forEachRecording(bookId, (_item, audio) => {
    const id = audio.personSlug;
    const singer = singers.get(id);
    if (singer) {
      singer.count++;
    } else {
      singers.set(id, { id, name: audio.title, count: 1 });
    }
  });

  return sortSingers(Array.from(singers.values()));
}

/**
 * Flat playlist of one singer's recordings, sorted by song first line.
 */
export function getSingerTracks(bookId: string, singerId: string): Array<TAudioTrack> {
  const tracks: Array<TAudioTrack> = [];

  forEachRecording(bookId, (item, audio) => {
    if (audio.personSlug !== singerId) return;
    tracks.push({ item, label: item.aliasName || item.title, url: audio.embed_url });
  });

  return tracks.sort((a, b) => compareFirstLines(a.label, b.label));
}

/**/
export function hasSinger(bookId: string, singerId: string): boolean {
  return getSingers(bookId).some((singer) => singer.id === singerId);
}

/**/
export function getSingerParamList(): Array<{ bookId: string; singerId: string }> {
  return getAudioBookIdParamList().flatMap(({ bookId }) =>
    getSingers(bookId).map((singer) => ({ bookId, singerId: singer.id }))
  );
}

/**
 * Visits every recording once per song, in contents order.
 */
function forEachRecording(bookId: string, fn: (item: TContentItem, audio: TAudio) => void) {
  const audioMap = getSongAudioMap(bookId);
  const seen = new Set<string>();

  for (const item of getAllItems(getContentsByBookId(bookId))) {
    const audioList = audioMap.get(item.id);
    if (!audioList || seen.has(item.id)) continue;
    seen.add(item.id);
    audioList.forEach((audio) => fn(item, audio));
  }
}

/**/
function getAllItems(groups: Array<TContentGroup>): Array<TContentItem> {
  return groups.flatMap((group: TContentGroup) => group.items);
}

/**/
function isAudioSong(item: TContentItem): boolean {
  return item.type === ITEM_TYPE.SONG && item.has?.audio && !item.title.includes('(hidden)');
}
