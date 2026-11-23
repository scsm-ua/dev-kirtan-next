import type {
  TSearchResponse,
  TSearchResult,
  TSearchResultItem
} from '@/components/search/SearchModule/types';

/**
 *
 */
export function lookFor(
  query: string,
  page: number
): Promise<TSearchResult | void> {
  const start = (page - 1) * 10 + 1;
  const url =
    'https://www.googleapis.com/customsearch/v1' +
    `?key=${process.env.NEXT_PUBLIC_SEARCH_API_KEY}` +
    `&cx=${process.env.NEXT_PUBLIC_SEARCH_ACCOUNT_ID}` +
    `&start=${start}` +
    `&q=${encodeURIComponent(query)}`;

  return fetch(url, {
    headers: { 'Content-Type': 'application/json' }
  })
    .then((r) => r.json())
    .then(({ error, items, searchInformation }: TSearchResponse) => {
      // Google answers errors (bad key, quota) as `{ error }` without `searchInformation`.
      if (error || !searchInformation) {
        throw new Error(`Search request failed: ${error?.message || 'no search information in the response'}`);
      }

      return {
        items: items as Array<TSearchResultItem>,
        itemsTotal: parseInt(searchInformation.totalResults)
      };
    });
}
