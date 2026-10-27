import { SITE } from '@/other/constants';

/**
 * Shared `Organization` + `WebSite` JSON-LD nodes, included in every page's
 * `@graph` so `isPartOf`/`publisher` references always resolve.
 */
export function getSiteGraphNodes() {
  return [
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
      name: SITE.NAME,
      alternateName: ['Kirtan Guide', 'Vaishnava Songbook'],
      description:
        'A digital Vaishnava songbook and kirtan guide with lyrics, translations, and audio recordings.',
      publisher: {
        '@id': 'https://scsmath.com/#organization'
      }
    }
  ];
}
