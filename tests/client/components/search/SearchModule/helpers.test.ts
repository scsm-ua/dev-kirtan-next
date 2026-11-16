import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { lookFor } from '@/components/search/SearchModule/helpers';

describe('lookFor', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  const requestedUrl = () => new URL(String(fetchMock.mock.calls[0][0]));

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ items: [{ title: 'Result' }], searchInformation: { totalResults: '25' } })
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks the Google search API with the site keys and the query', async () => {
    await lookFor('hare krishna', 1);
    const url = requestedUrl();

    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/customsearch/v1');
    expect(url.searchParams.get('key')).toBe(process.env.NEXT_PUBLIC_SEARCH_API_KEY);
    expect(url.searchParams.get('cx')).toBe(process.env.NEXT_PUBLIC_SEARCH_ACCOUNT_ID);
    expect(url.searchParams.get('q')).toBe('hare krishna');
  });

  it.each(['a & b', 'page #5', 'радхе + кришна', 'what?'])('sends the query "%s" whole', async (query) => {
    await lookFor(query, 1);

    expect(requestedUrl().searchParams.get('q')).toBe(query);
    expect(requestedUrl().hash).toBe('');
  });

  it.each([
    [1, '1'],
    [2, '11'],
    [5, '41']
  ])('asks for ten results from the start of page %i', async (page, start) => {
    await lookFor('query', page);

    expect(requestedUrl().searchParams.get('start')).toBe(start);
  });

  it('returns the results and their total number', async () => {
    expect(await lookFor('query', 1)).toEqual({ items: [{ title: 'Result' }], itemsTotal: 25 });
  });
});
