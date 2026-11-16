import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { sortSingers } from '@/other/sortSingers';
import {
  BOOKS_DIR,
  getBookIds,
  getBooksMap,
  getSongItems,
  readJson,
  readSong,
  ROOT
} from '@/tests/helpers/books';
import { findBook, findSong } from '@/tests/helpers/cases';

import type { TImage } from '@/types/resources';

/**
 * Rules for the shared resources (audio, images) as
 * `scripts/shared/prepareSharedResources.js` and `mapResources` write them.
 */

type TSharedAudio = {
  embed_url: string;
  personId: string;
  personSlug: string;
  title: Record<string, string>;
};
type TSharedResources = Record<string, { audio?: TSharedAudio[]; image?: TImage }>;

const shared = readJson<TSharedResources>(BOOKS_DIR, 'resources.json');
const urls = (audio: Array<{ embed_url: string }> = []) => audio.map((a) => a.embed_url).sort();

describe('source/books/resources.json', () => {
  it('gives every recording a link, a singer id, a singer slug and an English name', () => {
    const problems = Object.entries(shared).flatMap(([slug, { audio = [] }]) =>
      audio
        .filter((a) => !a.embed_url || !a.personId || !a.personSlug || !a.title?.en)
        .map((a) => `${slug}: ${a.embed_url}`)
    );

    expect(problems).toEqual([]);
  });
});

describe('source/books/images.json', () => {
  const images = readJson<Record<string, Omit<TImage, 'src'>>>(BOOKS_DIR, 'images.json');

  it('describes images that were copied to public/', () => {
    const problems = Object.entries(images)
      .filter(
        ([file, meta]) =>
          !(meta.width > 0 && meta.height > 0) ||
          !existsSync(path.join(ROOT, 'public/images/resources', file))
      )
      .map(([file]) => file);

    expect(problems).toEqual([]);
  });
});

describe.each(getBookIds())('song resources of %s', (bookId) => {
  const filter = getBooksMap()[bookId].audio?.filter?.by_title;
  const language = bookId.slice(0, 2);

  /** Runs `check` for every song; a returned text is a problem. */
  const checkSongs = (check: (slug: string) => string | false) => {
    const problems = getSongItems(bookId).flatMap(({ id }) => {
      const problem = check(id);
      return problem ? [`${bookId}/${id}: ${problem}`] : [];
    });

    expect(problems).toEqual([]);
  };

  it('has the recordings of the shared resources, minus the singers the book filters out', () => {
    checkSongs((slug) => {
      const expected = (shared[slug]?.audio || []).filter((a) => !filter || filter.includes(a.personId));
      const actual = readSong(bookId, slug).resources?.audio;

      return JSON.stringify(urls(actual)) !== JSON.stringify(urls(expected)) && 'recordings differ';
    });
  });

  it('names every singer in the book language, in English as a fallback', () => {
    checkSongs((slug) => {
      const wrong = (readSong(bookId, slug).resources?.audio || []).find((a) => {
        const source = shared[slug]?.audio?.find((s) => s.embed_url === a.embed_url);

        return (
          !source ||
          a.title !== (source.title[language] || source.title.en) ||
          a.personSlug !== source.personSlug ||
          'personId' in a
        );
      });

      return !!wrong && `wrong singer of ${wrong.embed_url}`;
    });
  });

  it('keeps the singers in the site order', () => {
    checkSongs((slug) => {
      const audio = readSong(bookId, slug).resources?.audio || [];

      return JSON.stringify(audio) !== JSON.stringify(sortSingers(audio)) && 'singers are out of order';
    });
  });

  it('points song images to files in public/', () => {
    checkSongs((slug) => {
      const image = readSong(bookId, slug).resources?.image;

      return !!image && !existsSync(path.join(ROOT, 'public', image.src)) && `no file ${image.src}`;
    });
  });
});

describe('cases the rules above rely on', () => {
  it('a real book filters singers', () => {
    expect(findBook('audio-filter')).toBeDefined();
  });

  it.each(['several-singers', 'image'] as const)('a real song covers "%s"', (name) => {
    expect(findSong(name)).toBeDefined();
  });
});
