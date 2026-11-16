import { describe, expect, it } from 'vitest';

import { getSingers, getSingerTracks } from '@/lib/audio';
import LdJsonAudio from '@/other/metadata/LdJsonAudio';
import { getAbsoluteUrl } from '@/other/paths';
import { getBooksMap } from '@/tests/helpers/books';
import { findSong } from '@/tests/helpers/cases';
import { findBrokenReferences, getNode, readLdJson } from '@/tests/helpers/ldJson';

type TItemList = {
  numberOfItems: number;
  itemListElement: Array<{ position: number; item: { name: string; url: string; byArtist: { name: string } } }>;
};

describe('LdJsonAudio', () => {
  const { bookId } = findSong('several-singers');
  const bookTitle = getBooksMap()[bookId].title;
  const [singer] = getSingers(bookId);
  const audioUrl = getAbsoluteUrl(`/${bookId}/audio/`);
  // Recordings point to the composition that the song page describes.
  const isSongPageNode = (id: string) => id.endsWith('#composition');

  describe('for the audio page', () => {
    const tracks = getSingerTracks(bookId);
    const graph = readLdJson(LdJsonAudio({ bookId, bookTitle, tracks }))['@graph'];

    it('is a graph whose references all resolve', () => {
      expect(findBrokenReferences(graph, isSongPageNode)).toEqual([]);
      expect(getNode(graph, 'CollectionPage')).toMatchObject({ '@id': audioUrl, url: audioUrl });
    });

    it('lists every track in order, linked to its song', () => {
      const list = getNode(graph, 'ItemList') as unknown as TItemList;

      expect(list.numberOfItems).toBe(tracks.length);
      expect(list.itemListElement.map((element) => element.position)).toEqual(tracks.map((_track, i) => i + 1));
      expect(list.itemListElement.map((element) => element.item.url)).toEqual(
        tracks.map((track) => getAbsoluteUrl(`/${bookId}/${track.item.id}/`))
      );
      expect(list.itemListElement.map((element) => element.item.byArtist.name)).toEqual(
        tracks.map((track) => track.singerName)
      );
    });

    it('ends the breadcrumb at the audio page', () => {
      const { itemListElement } = getNode(graph, 'BreadcrumbList') as { itemListElement: object[] };

      expect(itemListElement).toHaveLength(2);
      expect(itemListElement[1]).not.toHaveProperty('item');
    });
  });

  describe('for a singer page', () => {
    const tracks = getSingerTracks(bookId, singer.id);
    const graph = readLdJson(LdJsonAudio({ bookId, bookTitle, tracks, selected: singer }))['@graph'];
    const url = getAbsoluteUrl(`/${bookId}/audio/${singer.id}/`);

    it('is a graph about the singer page whose references all resolve', () => {
      expect(findBrokenReferences(graph, isSongPageNode)).toEqual([]);
      expect(getNode(graph, 'CollectionPage')).toMatchObject({ '@id': url, url });
      expect(getNode(graph, 'CollectionPage').name).toContain(singer.name);
      expect(getNode(graph, 'ItemList')).toMatchObject({ name: singer.name, numberOfItems: singer.count });
    });

    it('links the audio page in the breadcrumb and ends at the singer', () => {
      const { itemListElement } = getNode(graph, 'BreadcrumbList') as {
        itemListElement: Array<{ name: string; item?: string }>;
      };

      expect(itemListElement).toHaveLength(3);
      expect(itemListElement[1].item).toBe(audioUrl);
      expect(itemListElement[2]).toEqual(expect.objectContaining({ name: singer.name }));
      expect(itemListElement[2]).not.toHaveProperty('item');
    });
  });

  it('uses a direct link for a recording that is not on SoundCloud', () => {
    const [track] = getSingerTracks(bookId);
    const tracks = [
      { ...track, url: 'https://soundcloud.com/some-user/some-track' },
      { ...track, url: 'https://example.com/some-track.mp3' }
    ];
    const list = getNode(readLdJson(LdJsonAudio({ bookId, bookTitle, tracks }))['@graph'], 'ItemList');
    const [soundcloud, direct] = (list.itemListElement as Array<{ item: { audio: object } }>).map(
      (element) => element.item.audio
    );

    expect(soundcloud).toHaveProperty('embedUrl');
    expect(soundcloud).not.toHaveProperty('contentUrl');
    expect(direct).toMatchObject({ contentUrl: 'https://example.com/some-track.mp3' });
  });
});
