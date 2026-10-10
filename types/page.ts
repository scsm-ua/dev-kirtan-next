/**
 * A `page` content item: markdown prose instead of song verses.
 * `meta.title` is mandatory and drives the header + document metadata.
 */
export type TPage = {
  meta: {
    page?: string | string[];
    title: string;
  };
  body: string;
};
