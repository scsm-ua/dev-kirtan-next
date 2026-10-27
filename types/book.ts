/**/
export type TBookDescription = {
  hidden: boolean;
  slug: string;
  songsCount: number;
  sort_order: number;
  subtitle: string;
  title: string;
  title_full_short?: string;
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
export type ContentPageProps = {
  params: Promise<{
    bookId: string;
    slug: string;
  }>;
};
