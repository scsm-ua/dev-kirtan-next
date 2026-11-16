import { describe, expect, it } from 'vitest';

import LdJsonSong from '@/other/metadata/LdJsonSong';
import { getBookLocale } from '@/other/helpers';
import { getAbsoluteUrl, getSongPath } from '@/other/paths';
import { findBrokenReferences, getNode, readLdJson } from '@/tests/helpers/ldJson';
import { loadSongPage } from '@/tests/helpers/pageData';

import type { TSongCase } from '@/tests/helpers/cases';

/** JSON-LD of the first real song that covers the case, as the song route renders it. */
async function load(name: TSongCase) {
  const { data, route } = await loadSongPage(name);
  const { bookId, slug } = route;
  const element = LdJsonSong({
    bookDescriptions: data.descriptions,
    bookId,
    bookTitle: data.book.title,
    slug,
    song: data.song
  });

  return { ...data, bookId, graph: readLdJson(element)['@graph'], url: getAbsoluteUrl(getSongPath(bookId, slug)) };
}

describe('LdJsonSong', () => {
  it.each(['meta-author', 'no-author', 'several-singers', 'in-several-books'] as const)(
    'is a graph whose references all resolve: %s',
    async (name) => {
      const { graph, url } = await load(name);

      expect(findBrokenReferences(graph)).toEqual([]);
      expect(getNode(graph, 'WebPage')).toMatchObject({ '@id': url, url });
      expect(getNode(graph, 'MusicComposition')['@id']).toBe(`${url}#composition`);
    }
  );

  it('names the book, the contents and the song in the breadcrumb', async () => {
    const { book, graph, song } = await load('meta-author');
    const { itemListElement } = getNode(graph, 'BreadcrumbList') as { itemListElement: Array<{ name: string }> };

    expect(itemListElement.map((item) => item.name)).toEqual([
      book.title,
      expect.any(String),
      song.title.join(' ')
    ]);
  });

  it('names the author as the composer when the song has meta.author', async () => {
    const { graph, song } = await load('meta-author');

    expect(getNode(graph, 'MusicComposition').composer).toMatchObject({ name: song.meta.author });
  });

  it('names no composer for a song without meta.author', async () => {
    const { graph } = await load('author-line-only');

    expect(getNode(graph, 'MusicComposition')).not.toHaveProperty('composer');
  });

  it('lists a recording per singer', async () => {
    const { graph, song } = await load('several-singers');
    const { audio } = getNode(graph, 'MusicComposition') as { audio: Array<{ url: string }> };

    expect(audio.map((recording) => recording.url)).toEqual(song.resources.audio.map((a) => a.embed_url));
  });

  it('lists no recordings for a song without audio', async () => {
    const { graph } = await load('no-audio');

    expect(getNode(graph, 'MusicComposition')).not.toHaveProperty('audio');
  });

  it('links the same song in the other books as translations', async () => {
    const { bookId, descriptions, graph } = await load('in-several-books');
    const { workTranslation } = getNode(graph, 'MusicComposition') as {
      workTranslation: Array<{ inLanguage: string }>;
    };
    const others = descriptions.filter((book) => book.slug !== bookId);

    expect(workTranslation.map((work) => work.inLanguage)).toEqual(others.map((book) => getBookLocale(book.slug)));
  });

  it('adds the first line as another name of the song', async () => {
    const { graph, song } = await load('alt-first-lines');
    const { alternateName } = getNode(graph, 'MusicComposition') as { alternateName: string[] };

    expect(alternateName[0]).toBe(song.meta.first_line);
    expect(alternateName.length).toBeGreaterThan(1);
  });
});
