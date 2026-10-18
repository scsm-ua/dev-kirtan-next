import { getAbsoluteUrl, getSongbookPagePath, getSongbookPath } from '@/other/paths';
import { SITE } from '@/other/constants';
import { translate } from '@/other/i18n';

import type { TSongbookPage } from '@/other/paths';

/**/
type Props = {
  bookId: string;
  pageKey: string;
  page?: TSongbookPage;
};

/**
 *
 */
function LdJson({ bookId, pageKey, page }: Props) {
  const language = bookId.slice(0, 2);
  const url = getAbsoluteUrl(
    page ? getSongbookPagePath(bookId, page) : getSongbookPath(bookId)
  );

  const title = translate(bookId, pageKey + '.SCHEMA.NAME');
  const description = translate(bookId, pageKey + '.SCHEMA.DESCRIPTION');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://scsmath.com/#organization',
        name: 'Sri Chaitanya Saraswat Math',
        url: 'https://scsmath.com/'
      },
      {
        '@type': 'WebSite',
        '@id': SITE.ORIGIN + '#website',
        url: SITE.ORIGIN,
        name: 'Kirtan Site',
        description:
          'A digital Vaishnava songbook with lyrics, translations, and audio recordings.',
        publisher: {
          '@id': 'https://scsmath.com/#organization'
        }
      },
      {
        '@type': 'CollectionPage',
        '@id': url,
        url: url,
        name: title,
        description: description,
        inLanguage: language,
        isPartOf: {
          '@id': SITE.ORIGIN + '#website'
        }
      }
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
export default LdJson;

/*
* if (i18n_page && i18n) {
            title = i18n(i18n_page + '.SCHEMA.NAME');
            description = i18n(i18n_page + '.SCHEMA.DESCRIPTION');
        }

        const content = {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    "@type": "Organization",
                    "@id": "https://scsmath.com/#organization",
                    "name": "Sri Chaitanya Saraswat Math",
                    "url": "https://scsmath.com/"
                },
                {
                    '@type': 'WebSite',
                    '@id': ORIGIN + '/#website',
                    'url': ORIGIN + '/',
                    'name': 'Kirtan Site',
                    "description": "A digital Vaishnava songbook with lyrics, translations, and audio recordings.",
                    "publisher": {
                        "@id": "https://scsmath.com/#organization",
                    }
                },
                {
                    '@type': 'CollectionPage',
                    '@id': url,
                    'url': url,
                    'name': title,
                    'description': description,
                    'inLanguage': language || 'en',
                    'isPartOf': {
                        '@id': ORIGIN + '/#website'
                    }
                }
            ]
        };
*
* */

/*
*   const jsonLd: WithContext<Book> = {
    '@context': 'https://schema.org',
    '@type': 'Book',

     //audience
     //author
     //genre
     // maintainer
     // sourceOrganization
     // teaches

creator: CREATOR,
  description: description,
  image: imgSrc,
  inLanguage: bookId.slice(0, 2),
  keywords: KEYWORDS,
  name: title,
  publisher: PUBLISHER,
  sourceOrganization: 'https://scsmath.com/',
  teaches: 'Bhakti yoga',
  thumbnailUrl: imgSrc,
  url: SITE.ORIGIN + bookId
};
* */
