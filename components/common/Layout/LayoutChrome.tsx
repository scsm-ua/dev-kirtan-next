import classNames from 'classnames';

import './Layout.scss';
import Footer from '@/components/common/Footer/Footer';
import GlobalHotkeys from '@/components/common/GlobalHotkeys/GlobalHotkeys';
import { GoogleAnalytics } from '@/components/common/GoogleAnalytics';
import Header from '@/components/common/Header/Header';
import { ServiceWorkerRegistration } from '@/components/common/ServiceWorkerRegistration';

import type { TAnalyticsPageType } from '@/other/analytics';

/**/
export type TLayoutChromeProps = {
  bookId: string;
  className?: string;
  hideCacheStatus?: boolean; // No offline dot in the header (songbook list: it caches no book).
  itemId?: string;       // Analytics: song slug, page slug or singer id.
  page?: string | string[];
  pageType?: TAnalyticsPageType;
};

/**
 * Everything inside `<body>`: header, main, footer and the app-wide widgets.
 * Renders on the server and inside the client app alike.
 */
function LayoutChrome({
  bookId,
  children,
  className,
  hideCacheStatus,
  itemId,
  page,
  pageType
}: TLayoutChromeProps & { children: React.ReactNode }) {
  const cls = classNames('Main', className);

  return (
    <>
      <div className="Layout">
        <div className="Layout__content" tabIndex={-1}>
          <Header bookId={bookId} hideCacheStatus={hideCacheStatus} />
          <main className={cls}>
            {children}
          </main>
          {/* Inside the scroller: with the player dock it is the last element of the page. */}
          <Footer bookId={bookId} page={page} />
        </div>
      </div>

      <GoogleAnalytics bookId={bookId} itemId={itemId} pageType={pageType} />
      <ServiceWorkerRegistration />
      <GlobalHotkeys bookId={bookId} />
    </>
  );
}

/**/
export default LayoutChrome;
