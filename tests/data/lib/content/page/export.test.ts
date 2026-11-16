import { describe, expect, it } from 'vitest';

import { NAV_SPAN } from '@/lib/content/exportHtml';
import { renderPage } from '@/lib/content/page/export';

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN;

describe('renderPage', () => {
  const html = renderPage(
    {
      meta: { title: 'About' },
      body: [
        '# About',
        '[A song](/en/some-song/)',
        '[Another site](https://example.com/en/some-song/)',
        '![Alt](/images/resources/en/1.png)'
      ].join('\n\n')
    },
    'about'
  );

  it('wraps the page into a section that counts as translated', () => {
    expect(html.startsWith('<section class="song page" id="song-about" data-translated="1">\n')).toBe(true);
    expect(html.endsWith('</section>\n')).toBe(true);
  });

  it('shows the navigation links and the rendered markdown', () => {
    expect(html).toContain(`<h2>${NAV_SPAN}</h2>`);
    expect(html).toContain('<div class="PageMarkdown"><h1>About</h1>');
  });

  it('points links between items to places inside the document', () => {
    expect(html).toContain('<a href="#song-some-song">A song</a>');
  });

  it('keeps links to other sites', () => {
    expect(html).toContain('<a href="https://example.com/en/some-song/">Another site</a>');
  });

  it('makes site images absolute', () => {
    expect(html).toContain(`src="${ORIGIN}images/resources/en/1.png"`);
  });
});
