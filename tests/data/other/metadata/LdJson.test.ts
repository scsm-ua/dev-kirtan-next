import { describe, expect, it } from 'vitest';

import LdJson from '@/other/metadata/LdJson';
import { translate } from '@/other/i18n';
import { getAbsoluteUrl } from '@/other/paths';
import { getBookLocale } from '@/other/helpers';
import { getBookIds } from '@/tests/helpers/books';
import { findBrokenReferences, getNode, readLdJson } from '@/tests/helpers/ldJson';

describe.each(getBookIds())('LdJson for %s', (bookId) => {
  const { '@context': context, '@graph': graph } = readLdJson(
    LdJson({ bookId, pageKey: 'CONTENTS_PAGE', page: 'contents' })
  );

  it('is a schema.org graph whose references all resolve', () => {
    expect(context).toBe('https://schema.org');
    expect(findBrokenReferences(graph)).toEqual([]);
  });

  it('describes the page as a collection in the book language', () => {
    const url = getAbsoluteUrl(`/${bookId}/contents/`);

    expect(getNode(graph, 'CollectionPage')).toMatchObject({
      '@id': url,
      url,
      name: translate(bookId, 'CONTENTS_PAGE.SCHEMA.NAME'),
      description: translate(bookId, 'CONTENTS_PAGE.SCHEMA.DESCRIPTION'),
      inLanguage: getBookLocale(bookId)
    });
  });

  it('uses the book root when no page is given', () => {
    const { '@graph': rootGraph } = readLdJson(LdJson({ bookId, pageKey: 'BOOK_LIST_PAGE' }));

    expect(getNode(rootGraph, 'CollectionPage').url).toBe(getAbsoluteUrl(`/${bookId}/`));
  });
});
