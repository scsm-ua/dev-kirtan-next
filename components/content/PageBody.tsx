import ContentShell from '@/components/content/ContentShell';
import PageView from '@/components/page/PageView/PageView';

import type { TViewProps } from '@/components/app/views/types';

/**
 * Markdown page item body: prose rendered inside the shared chrome.
 */
function PageBody({ extras, page }: TViewProps<'page'>) {
  const { book, nav, page: content } = page.data;

  return (
    <ContentShell
      after={extras}
      bookId={page.route.bookId}
      bookTitle={book.title}
      nav={nav}
      page={content.meta?.page}
    >
      <PageView bodyHtml={content.bodyHtml} />
    </ContentShell>
  );
}

/**/
export default PageBody;
