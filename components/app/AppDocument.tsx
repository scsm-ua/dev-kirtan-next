import AppRoot from '@/components/app/AppRoot';
import DocumentHead from '@/components/common/Layout/DocumentHead';
import { getBookLocale } from '@/other/helpers';

import type { ReactNode } from 'react';
import type { TPageData } from '@/types/pageData';

/**/
type Props = {
  extras?: ReactNode;  // Server-only content of this page (JSON-LD).
  page: TPageData | null;  // `null` for the offline shell.
};

/**
 * Document of a reader page: static head plus the client app, which renders
 * from the same page data the `/data/` JSON files carry.
 */
function AppDocument({ extras, page }: Props) {
  return (
    <html lang={page ? getBookLocale(page.route.bookId) : 'en'}>
      <DocumentHead />

      <body className="Body">
        <AppRoot extras={extras} initial={page} />
      </body>
    </html>
  );
}

/**/
export default AppDocument;
