import { describe, expect, it } from 'vitest';

import { renderMarkdownBody } from '@/other/markdown';
import { renderImageTag } from '@/other/utils';

describe('renderMarkdownBody', () => {
  it('renders markdown to HTML', () => {
    expect(renderMarkdownBody('# Title\n\nSome *text*.')).toBe('<h1>Title</h1>\n<p>Some <em>text</em>.</p>\n');
  });

  it('renders images with the lazy-loading attributes', () => {
    expect(renderMarkdownBody('![Alt](/a.png)')).toBe(`<p>${renderImageTag('Alt', '/a.png')}</p>\n`);
  });

  it('passes raw HTML through', () => {
    const html = '<p class="SongRef"><a class="song-ref" href="/en/some-song/">line</a></p>';

    expect(renderMarkdownBody(html)).toContain(html);
  });
});
