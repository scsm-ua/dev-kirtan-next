import ContentShell from '@/components/content/ContentShell';
import PageView from '@/components/page/PageView/PageView';

import type { TContentBodyProps } from '@/lib/content/handler';
import type { TPage } from '@/types/page';

/**
 * Markdown page item body: prose rendered inside the shared chrome.
 */
function PageBody({ book, bookId, data: page, nav, slug }: TContentBodyProps<TPage>) {
  return (
    <ContentShell
      bookId={bookId}
      bookTitle={book.title}
      nav={nav}
      page={page.meta?.page}
      slug={slug}
    >
      <PageView page={page} />
    </ContentShell>
  );
}

/**/
export default PageBody;
