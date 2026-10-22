import Authors from '@/components/authors/Authors';
import AuthorBadges from '@/components/authors/AuthorBadges';
import BookDescription from '@/components/common/BookDescription/BookDescription';
import { getAuthorsPageMeta } from '@/other/metadata/getAuthorsPageMeta';
import { getBookIdParamList, getBooksMap } from '@/lib/books';
import { getAuthorsByBookId } from '@/lib/contents';
import Layout from '@/components/common/Layout/Layout';
import LdJson from '@/other/metadata/LdJson';
import { SONGBOOK_PAGE } from '@/other/paths';
import { translate } from '@/other/i18n';

import type { BookListPageProps } from '@/types/book';
import type { TContentGroup, TContentItem } from '@/types/common';

/** Ignores leading quotes / brackets (e.g. `‘`, `(`). */
function firstLineKey(s: string): string {
  return s.replace(/^[\s‘’'"“(]+/, '');
}

/** Shows songs by first line (title kept as tooltip), sorted by it. */
function byFirstLine(group: TContentGroup): TContentGroup {
  const items = group.items
    .map((item: TContentItem) => ({
      ...item,
      title: item.aliasName || item.title,
      aliasName: item.title
    }))
    .sort((a, b) => firstLineKey(a.title).localeCompare(firstLineKey(b.title)));
  return { ...group, items };
}

/**/
export const generateMetadata = getAuthorsPageMeta;
export const generateStaticParams = getBookIdParamList;

/**
 *
 */
async function AuthorsPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const contents = getAuthorsByBookId(bookId);

  const booksMap = getBooksMap();
  const book = booksMap[bookId];

  const items = contents.filter((g: TContentGroup) => g.name);

  const noAuthor = contents.find(
    (g: TContentGroup) => !g.name && g.items.length > 0
  );

  const groups = noAuthor
    ? [
        ...items,
        {
          items: noAuthor.items,
          name: translate(bookId, 'AUTHORS_PAGE.UNKNOWN_AUTHOR')
        }
      ]
    : items;

  return (
    <Layout bookId={bookId}>
      <div className="Main__container Authors">
        <div className="IndexPage__title">
          <BookDescription bookDescription={book} />
        </div>

        <div className="Main__content">
          <AuthorBadges contents={items} />
          <Authors bookId={bookId} contents={groups.map(byFirstLine)} />
        </div>

        <LdJson bookId={bookId} pageKey="AUTHORS_PAGE" page={SONGBOOK_PAGE.AUTHORS} />
      </div>
    </Layout>
  );
}

/**/
export default AuthorsPage;
