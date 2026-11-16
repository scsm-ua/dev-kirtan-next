import DocumentHead from '@/components/common/Layout/DocumentHead';
import LayoutChrome from '@/components/common/Layout/LayoutChrome';
import { getBookLocale } from '@/other/helpers';

import type { TLayoutChromeProps } from '@/components/common/Layout/LayoutChrome';

/**
 * Full document for pages outside the client app (analyze, 404).
 */
function Layout({
  children,
  ...chrome
}: Readonly<TLayoutChromeProps & { children: React.ReactNode }>) {
  return (
    <html lang={getBookLocale(chrome.bookId)}>
      <DocumentHead />

      <body className="Body">
        <LayoutChrome {...chrome}>{children}</LayoutChrome>
      </body>
    </html>
  );
}

/**/
export default Layout;
