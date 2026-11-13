import { getBookLocale, getIFrameUrl } from '@/other/helpers';
import {
  getAbsoluteUrl,
  getAudioSingerPath,
  getSongbookPagePath,
  getSongbookPath,
  getSongPath,
  SONGBOOK_PAGE
} from '@/other/paths';
import { getSiteGraphNodes } from '@/other/metadata/helpers/getSiteGraphNodes';
import { SITE } from '@/other/constants';
import { translate } from '@/other/i18n';

import type { TAudioTrack, TSinger } from '@/types/audio';

/**/
type Props = {
  bookId: string;
  bookTitle: string;
  tracks: Array<TAudioTrack>;
  selected?: TSinger;
};

/**/
const SOUNDCLOUD_RE = /^https?:\/\/([\w-]+\.)?soundcloud\.com\//i;

/**
 * Audio index / singer playlist: a CollectionPage whose main entity is the
 * ItemList of every MusicRecording shown on the page.
 */
function LdJsonAudio({ bookId, bookTitle, tracks, selected }: Props) {
  const locale = getBookLocale(bookId);
  const audioUrl = getAbsoluteUrl(getSongbookPagePath(bookId, SONGBOOK_PAGE.AUDIO));
  const url = selected ? getAbsoluteUrl(getAudioSingerPath(bookId, selected.id)) : audioUrl;
  const audioTitle = translate(bookId, 'AUDIO_PAGE.LINK_FULL_TITLE');
  const name = selected
    ? `${selected.name} – ${audioTitle}`
    : translate(bookId, 'AUDIO_PAGE.SCHEMA.NAME');

  const itemList = {
    '@type': 'ItemList',
    '@id': url + '#playlist',
    name: selected?.name ?? translate(bookId, 'AUDIO_PAGE.ALL_RECORDINGS'),
    numberOfItems: tracks.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: tracks.map((track, index) => {
      const songUrl = getAbsoluteUrl(getSongPath(bookId, track.item.id));

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'MusicRecording',
          name: track.label,
          url: songUrl,
          inLanguage: locale,
          byArtist: {
            '@type': 'Person',
            name: track.singerName
          },
          recordingOf: {
            '@id': songUrl + '#composition'
          },
          audio: {
            '@type': 'AudioObject',
            ...(SOUNDCLOUD_RE.test(track.url)
              ? { embedUrl: getIFrameUrl(track.url) }
              : { contentUrl: track.url })
          }
        }
      };
    })
  };

  const breadcrumbItems = [
    { name: bookTitle, item: getAbsoluteUrl(getSongbookPath(bookId)) },
    { name: audioTitle, item: selected ? audioUrl : undefined },
    ...(selected ? [{ name: selected.name, item: undefined }] : [])
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      ...getSiteGraphNodes(),
      {
        '@type': 'CollectionPage',
        '@id': url,
        url,
        name,
        description: translate(bookId, 'AUDIO_PAGE.SCHEMA.DESCRIPTION'),
        inLanguage: locale,
        breadcrumb: { '@id': url + '#breadcrumb' },
        mainEntity: { '@id': url + '#playlist' },
        isPartOf: { '@id': SITE.ORIGIN + '#website' }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumb',
        itemListElement: breadcrumbItems.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          ...(crumb.item && { item: crumb.item })
        }))
      },
      itemList
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')
      }}
    />
  );
}

/**/
export default LdJsonAudio;
