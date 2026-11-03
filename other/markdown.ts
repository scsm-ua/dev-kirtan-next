import { Marked } from 'marked';

import { renderImageTag } from '@/other/utils';

// Markdown images (no known size) still get the lazy-loading attributes.
const marked = new Marked({
  renderer: {
    image({ href, text }) {
      return renderImageTag(text, href);
    }
  }
});

/**
 * Single source of truth for markdown → HTML. Pure (no React/DOM) so it is
 * shared by the in-app page view and the export builder, keeping both renders
 * identical. Input is trusted authored content from the songbook source.
 */
export function renderMarkdownBody(body: string): string {
  return marked.parse(body, { async: false }) as string;
}
