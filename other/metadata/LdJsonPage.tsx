import { getBookLocale } from '@/other/helpers';
import {
  getAbsoluteUrl,
  getSongbookPagePath,
  getSongbookPath,
  getSongPath,
  SONGBOOK_PAGE
} from '@/other/paths';
import { getSiteGraphNodes } from '@/other/metadata/helpers/getSiteGraphNodes';
import { SITE } from '@/other/constants';
import { translate } from '@/other/i18n';

/**/
type Props = {
  bookId: string;
  bookTitle: string;
  slug: string;
  title: string;
};

/**
 * JSON-LD for a markdown `page` item: WebPage + Article + breadcrumb.
 */
function LdJsonPage({ bookId, bookTitle, slug, title }: Props) {
  const locale = getBookLocale(bookId);
  const url = getAbsoluteUrl(getSongPath(bookId, slug));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      ...getSiteGraphNodes(),
      {
        '@type': 'WebPage',
        '@id': url,
        url: url,
        name: title,
        inLanguage: locale,
        description: title,
        breadcrumb: {
          '@id': url + '#breadcrumb'
        },
        mainEntity: {
          '@id': url + '#article'
        },
        isPartOf: {
          '@id': SITE.ORIGIN + '#website'
        }
      },
      {
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
            name: title
          }
        ]
      },
      {
        '@type': 'Article',
        '@id': url + '#article',
        headline: title,
        url: url,
        inLanguage: locale,
        isPartOf: {
          '@id': SITE.ORIGIN + '#website'
        },
        mainEntityOfPage: {
          '@id': url
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
export default LdJsonPage;
