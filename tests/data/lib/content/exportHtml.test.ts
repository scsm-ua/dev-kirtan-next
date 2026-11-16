import { describe, expect, it } from 'vitest';

import { heading, NAV_SPAN } from '@/lib/content/exportHtml';

describe('heading', () => {
  it('renders a heading of the given level', () => {
    expect(heading(2, 'Title')).toBe('<h2>Title</h2>\n');
  });

  it('adds a class', () => {
    expect(heading(1, 'Title', 'book-title')).toBe('<h1 class="book-title">Title</h1>\n');
  });

  it('escapes the text', () => {
    expect(heading(3, 'a < b & c')).toBe('<h3>a &lt; b &amp; c</h3>\n');
  });

  it('renders nothing without text', () => {
    expect(heading(2, '')).toBe('');
    expect(heading(2, undefined)).toBe('');
  });
});

describe('NAV_SPAN', () => {
  it('links to the contents and to the first-lines index', () => {
    expect(NAV_SPAN).toContain('href="#toc"');
    expect(NAV_SPAN).toContain('href="#first-lines"');
  });
});
