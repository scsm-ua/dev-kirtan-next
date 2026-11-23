/**/
export type TSearchResultItem = {
  htmlFormattedUrl: string;
  htmlSnippet: string;
  htmlTitle: string;
  link: string;
};

/**/
export type TSearchResponse = {
  error?: { code?: number; message?: string };
  items?: Array<TSearchResultItem>;
  searchInformation?: {
    totalResults: string;
  };
};

/**/
export type TSearchResult = {
  items: Array<TSearchResultItem>;
  itemsTotal: number;
};
