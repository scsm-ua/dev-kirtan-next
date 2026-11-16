import { describe, expect, it } from 'vitest';

import { SITE } from '@/other/constants';
import { getPageMeta } from '@/other/metadata/helpers/getPageMeta';
import { translate } from '@/other/i18n';
import { getAbsoluteUrl } from '@/other/paths';
import { getBookIds, getBooksMap } from '@/tests/helpers/books';

const DESCRIPTION_KEY = 'CONTENTS_PAGE.HEAD.DESCRIPTION';

describe.each(getBookIds())('getPageMeta for %s', (bookId) => {
  const book = getBooksMap()[bookId];

  it('titles a page with the book name and the site name', () => {
    const meta = getPageMeta({ bookId, descriptionKey: DESCRIPTION_KEY });

    expect(meta.title).toBe(`${book.title_full_short || book.title} | ${SITE.NAME}`);
  });

  it('prefers the given title', () => {
    const meta = getPageMeta({ bookId, descriptionKey: DESCRIPTION_KEY, title: 'Own Title' });

    expect(meta.title).toBe(`Own Title | ${SITE.NAME}`);
  });

  it('takes the description from the translations of the book language', () => {
    const meta = getPageMeta({ bookId, descriptionKey: DESCRIPTION_KEY });

    expect(meta.description).toBe(translate(bookId, DESCRIPTION_KEY));
    expect(meta.description).toBeTruthy();
  });

  it('uses the book root, or the given root page, as the canonical and the shared URL', () => {
    const root = getPageMeta({ bookId, descriptionKey: DESCRIPTION_KEY });
    const contents = getPageMeta({ bookId, descriptionKey: DESCRIPTION_KEY, page: 'contents' });

    expect(root.alternates.canonical).toBe(`/${bookId}/`);
    expect(root.openGraph.url).toBe(getAbsoluteUrl(`/${bookId}/`));
    expect(contents.alternates.canonical).toBe(`/${bookId}/contents/`);
    expect(contents.openGraph.url).toBe(getAbsoluteUrl(`/${bookId}/contents/`));
  });
});
