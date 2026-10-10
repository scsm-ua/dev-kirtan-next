import { escHtml as esc } from '@/other/exportDoc';

import type { TContentGroup } from '@/types/common';

// 4-space indented "first line … page number" reference, e.g.
// "    kali-kukkura-kadana yadi chāo he 49" / "… pages 192 - 207".
const REF_LINE = /^ {4}(.+?)\s+((?:pages\s+)?\d+(?:\s*[-–]\s*\d+)?)\s*$/;

type TLineIndex = {
  // Normalized first line -> slug; null marks a collision between songs.
  exact: Map<string, string | null>;
  entries: Array<[string, string]>;
};

/**
 * Case/diacritics/punctuation-insensitive comparison key for first lines.
 */
function normalizeLine(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Builds a lookup from the a-z index groups, whose `title` entries are the
 * songs' `first_line` / `alt_first_lines` (plus bracket-stripped variants).
 */
function buildLineIndex(groups: Array<TContentGroup>): TLineIndex {
  const exact = new Map<string, string | null>();
  const entries: Array<[string, string]> = [];

  for (const group of groups) {
    for (const item of group.items) {
      const key = normalizeLine(item.title);
      if (!key) continue;
      entries.push([key, item.id]);
      const prev = exact.get(key);
      if (prev === undefined) exact.set(key, item.id);
      else if (prev !== item.id) exact.set(key, null);
    }
  }

  return { exact, entries };
}

/**
 * Page number -> item slug; null marks pages shared by several items.
 * Used for refs that are not first lines (e.g. "Recitation of the Vandana
 * prayers 15"). Note: a-z groups omit items without a first line (markdown
 * pages, intro), so only songs are resolvable this way.
 */
function buildPageIndex(groups: Array<TContentGroup>): Map<string, string | null> {
  const byPage = new Map<string, string | null>();

  for (const group of groups) {
    for (const item of group.items) {
      const pages = item.pages?.length ? item.pages : [item.page];
      for (const p of pages) {
        if (p === undefined || p === null || p === '') continue;
        const key = String(p);
        const prev = byPage.get(key);
        if (prev === undefined) byPage.set(key, item.id);
        else if (prev !== item.id) byPage.set(key, null);
      }
    }
  }

  return byPage;
}

/**
 * Resolves a referenced line to a song slug: exact match first, then a
 * unique whole-word prefix match (page refs are often truncated first lines).
 */
function findSong(key: string, index: TLineIndex): string | null {
  const exact = index.exact.get(key);
  if (exact !== undefined) return exact;

  const ids = new Set<string>();
  for (const [line, id] of index.entries) {
    if (line.startsWith(key + ' ') || key.startsWith(line + ' ')) ids.add(id);
  }
  return ids.size === 1 ? ids.values().next().value! : null;
}

/**
 * Replaces indented "first line + page number" song references in a page's
 * markdown body with links to the corresponding songs. Unresolved lines are
 * left untouched. The emitted block is raw HTML so `marked` passes it through;
 * the export builder rewrites the hrefs into in-document anchors.
 */
export function linkifySongRefs(
  body: string,
  indexGroups: Array<TContentGroup>,
  bookId: string
): string {
  const index = buildLineIndex(indexGroups);
  const byPage = buildPageIndex(indexGroups);

  return body
    .split('\n')
    .map((line) => {
      const m = REF_LINE.exec(line);
      if (!m) return line;

      const byLine = findSong(normalizeLine(m[1]), index);
      // Not a first line: fall back to the page number when it is
      // unambiguous (a plain number owned by a single item).
      const slug =
        byLine ?? (/^\d+$/.test(m[2]) ? (byPage.get(m[2]) ?? null) : null);
      if (!slug) return line;

      // First-line refs are italicized like verse quotations.
      const text = byLine ? `<em>${esc(m[1])}</em>` : esc(m[1]);

      return (
        `<p class="SongRef"><a class="song-ref" href="/${bookId}/${slug}/">` +
        `${text}</a> <span class="page-num">${esc(m[2])}</span></p>`
      );
    })
    .join('\n');
}
