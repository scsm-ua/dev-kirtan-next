import AppRoot from '@/components/app/AppRoot';
import DocumentHead from '@/components/common/Layout/DocumentHead';
import { getBookLocale } from '@/other/helpers';

import type { ReactNode } from 'react';
import type { TPageData } from '@/types/pageData';

/**/
type Props = {
  extras?: ReactNode;  // Server-only content of this page (JSON-LD).
  head?: ReactNode;  // Extra content of `<head>` (the inline script of the root page).
  page: TPageData | null;  // `null` for the offline shell.
};

/**
 * Document of a reader page: static head plus the client app, which renders
 * from the same page data the `/data/` JSON files carry.
 */
function AppDocument({ extras, head, page }: Props) {
  return (
    // The inline script of the root page may add an attribute before hydration.
    <html lang={page ? getBookLocale(page.route.bookId) : 'en'} suppressHydrationWarning>
      <DocumentHead>{head}</DocumentHead>

      <body className="Body">
        <AppRoot extras={extras} initial={page} />
      </body>
    </html>
  );
}

/**/
export default AppDocument;
