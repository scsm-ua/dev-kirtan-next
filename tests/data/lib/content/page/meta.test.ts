import { describe, expect, it } from 'vitest';

import { getPageMeta } from '@/lib/content/page/meta';
import { getAbsoluteUrl } from '@/other/paths';

describe('getPageMeta', () => {
  const meta = getPageMeta({ meta: { title: 'About' }, body: 'text' }, { bookId: 'en', slug: 'about' });

  it('uses the page title as the title and the description', () => {
    expect(meta.title).toBe('About');
    expect(meta.description).toBe('About');
  });

  it('has the page path as the canonical', () => {
    expect(meta.alternates.canonical).toBe('/en/about/');
  });

  it('describes the page as an article at its absolute URL', () => {
    expect(meta.openGraph).toMatchObject({
      title: 'About',
      type: 'article',
      url: getAbsoluteUrl('/en/about/')
    });
  });
});
