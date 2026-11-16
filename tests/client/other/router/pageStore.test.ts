import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getBookIds } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

import type { TPageData, TRoute } from '@/types/pageData';

const [bookId] = getBookIds();
const ROUTE: TRoute = { kind: 'contents', bookId };
const DATA_URL = `/data/${bookId}/contents.json`;

let page: TPageData;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

/** The store keeps its cache in the module, so every test loads a fresh copy. */
async function loadStore() {
  vi.resetModules();
  return import('@/other/router/pageStore');
}

beforeAll(async () => {
  page = await loadPage(ROUTE, 'contents');
});

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>(async () => Response.json(page));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('loadRoute', () => {
  it('fetches the data file of the route', async () => {
    const { loadRoute } = await loadStore();

    expect(await loadRoute(ROUTE)).toEqual(JSON.parse(JSON.stringify(page)));
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(DATA_URL);
  });

  it('answers the second request from memory', async () => {
    const { loadRoute } = await loadStore();
    const first = await loadRoute(ROUTE);

    expect(await loadRoute(ROUTE)).toBe(first);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('shares one request between callers that ask at the same time', async () => {
    const { loadRoute } = await loadStore();
    const [a, b] = await Promise.all([loadRoute(ROUTE), loadRoute(ROUTE)]);

    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    ['a missing file', async () => new Response('Not found', { status: 404 })],
    ['data from another build', async () => Response.json({ ...page, build: 'another-build' })],
    [
      'a network error',
      async () => {
        throw new TypeError('Failed to fetch');
      }
    ]
  ])('rejects on %s and tries again next time', async (_name, respond) => {
    const { loadRoute } = await loadStore();
    fetchMock.mockImplementationOnce(respond);

    await expect(loadRoute(ROUTE)).rejects.toThrow();
    await expect(loadRoute(ROUTE)).resolves.toMatchObject({ kind: 'contents' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('prefetchRoute', () => {
  it('loads the page ahead, so the navigation needs no request', async () => {
    const { loadRoute, prefetchRoute } = await loadStore();

    prefetchRoute(ROUTE);
    await loadRoute(ROUTE);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('ignores a failure', async () => {
    const { loadRoute, prefetchRoute } = await loadStore();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    prefetchRoute(ROUTE);

    await expect(loadRoute(ROUTE)).rejects.toThrow();
  });
});

describe('seedRoute', () => {
  it('stores the page that came with the document', async () => {
    const { loadRoute, seedRoute } = await loadStore();

    seedRoute(page);

    expect(await loadRoute(ROUTE)).toBe(page);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('in development', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('reads fresh data on every request and accepts any build', async () => {
    const { loadRoute, seedRoute } = await loadStore();
    fetchMock.mockImplementation(async () => Response.json({ ...page, build: 'another-build' }));

    seedRoute(page);
    await loadRoute(ROUTE);
    await loadRoute(ROUTE);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not prefetch', async () => {
    const { prefetchRoute } = await loadStore();

    prefetchRoute(ROUTE);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
