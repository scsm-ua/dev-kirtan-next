import Layout from '@/components/common/Layout/Layout';
import PageNumber from '@/components/song/PageNumber/PageNumber';
import PrevNextNav from '@/components/song/PrevNextNav/PrevNextNav';
import { translate } from '@/other/i18n';

import type { ReactNode } from 'react';
import type { TNavItemsMap } from '@/types/song';

/**/
type TProps = {
  after?: ReactNode;        // Rendered outside the content panel (e.g. JSON-LD).
  bookId: string;
  bookTitle: string;
  children: ReactNode;      // Type-specific main content.
  controls?: ReactNode;     // Header controls (share, other translations, …).
  headerExtra?: ReactNode;  // Extra header content below the top section.
  nav: TNavItemsMap;
  page?: string | string[];
  slug: string;
};

/**
 * Shared chrome for all content item types (songs, pages): Layout, the
 * book/page-number header block and prev/next navigation.
 */
function ContentShell({
  after,
  bookId,
  bookTitle,
  children,
  controls,
  headerExtra,
  nav,
  page,
  slug
}: TProps) {
  return (
    <Layout bookId={bookId} className="ContentPage" page={page} songId={slug}>
      <div className="Main__container ContentPage__container">
        <div className="ContentPage__content">
          <header className="ContentPage__header">
            <section className="ContentPage__top">
              <div className="ContentPage__info">
                <h6 className="ContentPage__book">{bookTitle}</h6>

                <PageNumber
                  bookId={bookId}
                  label={translate(bookId, 'SONG_PAGE.PAGE_NUMBER')}
                  page={page}
                />
              </div>

              {controls && (
                <div className="ContentPage__controls">{controls}</div>
              )}
            </section>

            {headerExtra}
          </header>

          {children}
        </div>
      </div>

      <PrevNextNav navMap={nav} />
      {after}
    </Layout>
  );
}

/**/
export default ContentShell;
