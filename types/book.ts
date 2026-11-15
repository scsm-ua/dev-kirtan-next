/** Merged at build time from the package's songbook.json, source/songbooks.json and the song count. */
export type TBookDescription = {
  audio?: { filter?: { by_title?: Array<string> } };
  hidden?: boolean;
  language?: string;
  render?: Record<string, boolean | number>;
  shortcuts?: Array<TShortcut>;
  slug: string;
  songsCount: number;
  sort_order?: number;
  subtitle: string;
  title: string;
  title_full_short?: string;
};

/** Extra index-page link to a content item. */
export type TShortcut = {
  icon: 'clock';
  slug: string;
  title: string;
};

/**/
export type TBooksMap = Record<string, TBookDescription>;

/**/
export type TBookContext = {
  bookId: string;
  booksMap: TBooksMap;
};

/**/
export type BookListPageProps = {
  params: Promise<{ bookId: string }>;
};

/**/
export type SingerPageProps = {
  params: Promise<{
    bookId: string;
    singerId: string;
  }>;
};

/**/
export type ContentPageProps = {
  params: Promise<{
    bookId: string;
    slug: string;
  }>;
};
