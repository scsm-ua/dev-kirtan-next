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
import type { TContentGroup } from '@/types/common';

/**/
export const generateMetadata = getAuthorsPageMeta;
export const generateStaticParams = getBookIdParamList;

/**
 *
 */
async function AuthorsPage({ params }: BookListPageProps) {
  const { bookId } = await params;
  const contents = await getAuthorsByBookId(bookId);

  const booksMap = getBooksMap();
  const book = booksMap[bookId];

  const label = translate(bookId, 'AUTHORS_PAGE.NO_AUTHOR');
  const items = contents.filter((g: TContentGroup) => g.name);

  const noAuthor = contents.find(
    (g: TContentGroup) => !g.name && g.items.length > 0
  );

  if (noAuthor) {
    items.push({
      items: noAuthor.items,
      name: label
    });
  }

  return (
    <Layout bookId={bookId}>
      <div className="Main__container Authors">
        <div className="IndexPage__title">
          <BookDescription bookDescription={book} />
        </div>

        <div className="Main__content">
          <AuthorBadges contents={items} />
          <Authors bookId={bookId} contents={items} />
        </div>

        <LdJson bookId={bookId} pageKey="AUTHORS_PAGE" page={SONGBOOK_PAGE.AUTHORS} />
      </div>
    </Layout>
  );
}

/**/
export default AuthorsPage;
