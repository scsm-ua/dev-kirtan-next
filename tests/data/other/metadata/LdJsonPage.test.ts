import { describe, expect, it } from 'vitest';

import LdJsonPage from '@/other/metadata/LdJsonPage';
import { getAbsoluteUrl } from '@/other/paths';
import { findBrokenReferences, getNode, readLdJson } from '@/tests/helpers/ldJson';

describe('LdJsonPage', () => {
  const graph = readLdJson(
    LdJsonPage({ bookId: 'ua', bookTitle: 'Book Title', slug: 'about', title: 'About <the> book' })
  )['@graph'];
  const url = getAbsoluteUrl('/ua/about/');

  it('is a graph whose references all resolve', () => {
    expect(findBrokenReferences(graph)).toEqual([]);
  });

  it('describes the page and its article in the book locale', () => {
    expect(getNode(graph, 'WebPage')).toMatchObject({ '@id': url, name: 'About <the> book', inLanguage: 'uk' });
    expect(getNode(graph, 'Article')).toMatchObject({
      '@id': `${url}#article`,
      headline: 'About <the> book',
      inLanguage: 'uk'
    });
  });

  it('names the book, the contents and the page in the breadcrumb', () => {
    const { itemListElement } = getNode(graph, 'BreadcrumbList') as {
      itemListElement: Array<{ name: string; item?: string }>;
    };

    expect(itemListElement.map((item) => item.name)).toEqual(['Book Title', expect.any(String), 'About <the> book']);
    expect(itemListElement[0].item).toBe(getAbsoluteUrl('/ua/'));
    expect(itemListElement[1].item).toBe(getAbsoluteUrl('/ua/contents/'));
  });

  it('cannot close the script element it is written into', () => {
    const element = LdJsonPage({ bookId: 'ua', bookTitle: 'Book', slug: 'about', title: '</script>' });
    const { __html } = (element.props as { dangerouslySetInnerHTML: { __html: string } }).dangerouslySetInnerHTML;

    expect(__html).not.toContain('<');
  });
});
