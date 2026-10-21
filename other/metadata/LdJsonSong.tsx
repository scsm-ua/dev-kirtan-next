import { getBookLocale, getIFrameUrl } from '@/other/helpers';
import { getDescription } from '@/lib/content/song/meta';
import {
  getAbsoluteUrl,
  getSongbookPagePath,
  getSongbookPath,
  getSongPath,
  SONGBOOK_PAGE
} from '@/other/paths';
import { getSiteGraphNodes } from '@/other/metadata/helpers/getSiteGraphNodes';
import { getSongPageTitle } from '@/other/metadata/helpers/getSongPageTitle';
import { SITE } from '@/other/constants';
import { translate } from '@/other/i18n';

import type { TAudio } from '@/types/resources';
import type { TBookDescription } from '@/types/book';
import type { TSong } from '@/types/song';

/**/
type Props = {
  bookDescriptions: TBookDescription[];
  bookId: string;
  bookTitle: string;
  slug: string;
  song: TSong;
};

/**
 *
 */
function LdJsonSong({ bookDescriptions, bookId, bookTitle, slug, song }: Props) {
  // Raw book language key (i18n lookups); locale is the BCP-47 code (ua → uk).
  const language = bookId.slice(0, 2);
  const locale = getBookLocale(bookId);
  const url = getAbsoluteUrl(getSongPath(bookId, slug));

  const author = song.meta?.author;
  const pageName = getSongPageTitle(song);
  const description = getDescription(song, bookId, bookTitle);

  // The same song in other-language songbooks, linked as translations.
  const workTranslation = bookDescriptions
    .filter((book: TBookDescription) => book.slug !== bookId)
    .map((book: TBookDescription) => ({
      '@type': 'MusicComposition',
      '@id': getAbsoluteUrl(getSongPath(book.slug, slug)) + '#composition',
      inLanguage: getBookLocale(book.slug)
    }));

  const alternateName = [
    song.meta?.first_line,
    ...[song.meta?.alt_first_lines ?? []].flat()
  ].filter(Boolean);

  const composition = {
    '@type': 'MusicComposition',
    '@id': url + '#composition',
    ...(alternateName.length > 0 && { alternateName }),
    name: pageName,
    description,
    url: url,
    inLanguage: locale,
    ...(author && {
      composer: {
        '@type': 'Person',
        name: author
      },
      lyricist: {
        '@type': 'Person',
        name: author
      }
    }),
    lyrics: {
      '@type': 'CreativeWork',
      inLanguage: locale
    },
    isPartOf: {
      '@id': SITE.ORIGIN + '#website'
    },
    about: [
      { '@type': 'Thing', name: 'Bhakti Yoga' },
      { '@type': 'Thing', name: 'Gaudiya Vaishnavism' }
    ],
    genre: ['Devotional', 'Bhajan', 'Kirtan'],
    ...(workTranslation.length > 0 && { workTranslation }),
    mainEntityOfPage: {
      '@id': url
    }
  };

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': url + '#breadcrumb',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: bookTitle,
        item: getAbsoluteUrl(getSongbookPath(bookId))
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: translate(bookId, 'FOOTER.CONTENTS'),
        item: getAbsoluteUrl(
          getSongbookPagePath(bookId, SONGBOOK_PAGE.CONTENTS)
        )
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: song.title.join(' ')
      }
    ]
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      ...getSiteGraphNodes(),
      {
        '@type': 'WebPage',
        '@id': url,
        url: url,
        name: getSongPageTitle(song),
        inLanguage: locale,
        description,
        breadcrumb: {
          '@id': url + '#breadcrumb'
        },
        mainEntity: {
          '@id': url + '#composition'
        },
        isPartOf: {
          '@id': SITE.ORIGIN + '#website'
        }
      },
      breadcrumb,
      composition
    ]
  };

  if (song.resources?.audio?.length > 0) {
    composition['audio'] = song.resources.audio.map((audio: TAudio) => ({
      '@type': 'MusicRecording',
      name: song.title.join(' '),
      inLanguage: locale,
      url: audio.embed_url,
      byArtist: {
        '@type': 'Person',
        name: audio.title[language] || audio.title.en
      },
      audio: {
        '@type': 'AudioObject',
        embedUrl: getIFrameUrl(audio.embed_url)
      }
    }));
  }

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
export default LdJsonSong;
