import { escHtml as esc } from '@/other/exportDoc';

/**
 * Shared primitives for the per-type `renderExport` implementations and the
 * export document builder (`lib/export.ts`).
 */

// Shared nav affordance appended to song/page headings.
export const NAV_SPAN =
  ' <span class="nav-links">&nbsp;&nbsp;<a href="#toc">↑</a>&nbsp;&nbsp;<a href="#first-lines">↓</a></span>';

/**
 *
 */
export function heading(level: number, text: string, cls?: string): string {
  if (!text) return '';
  const attr = cls ? ` class="${cls}"` : '';
  return `<h${level}${attr}>${esc(text)}</h${level}>\n`;
}
