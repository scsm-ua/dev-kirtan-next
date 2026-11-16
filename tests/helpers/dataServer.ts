import { vi } from 'vitest';

import { loadPageData } from '@/lib/pageData';
import { parseAudioFile, parseItemFile } from '@/other/router/routes';

import type { TRoute } from '@/types/pageData';

const DATA_URL = /^\/data\/([^/]+)\/(audio\/)?([^/]+)$/;

/** Route of a `/data/…json` URL, or `null`. */
function parseDataUrl(pathname: string): TRoute | null {
  const match = DATA_URL.exec(pathname);
  if (!match) return null;

  const [, bookId, audio, file] = match;
  return audio ? parseAudioFile(bookId, file) : parseItemFile(bookId, file);
}

/**
 * Replaces `fetch` with one that answers `/data/**` requests with the real
 * page data, as the static site does, and everything else with 404.
 * Undo with `vi.unstubAllGlobals()`.
 */
export function mockDataFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const route = parseDataUrl(new URL(String(input), window.location.href).pathname);
    const page = route && (await loadPageData(route));

    return page ? Response.json(page) : new Response('Not found', { status: 404 });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
