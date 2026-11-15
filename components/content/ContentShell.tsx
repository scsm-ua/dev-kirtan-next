import './ContentPage.scss';
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
};

/**
 * Shared content of all item types (songs, pages): the book/page-number
 * header block and prev/next navigation. The page chrome comes from the view
 * registry (`.ContentPage` main class).
 */
function ContentShell({
  after,
  bookId,
  bookTitle,
  children,
  controls,
  headerExtra,
  nav,
  page
}: TProps) {
  return (
    <>
      <div className="Main__container ContentPage__container">
        <article className="ContentPage__content">
          <header className="ContentPage__header">
            <section className="ContentPage__top">
              <div className="ContentPage__info">
                <p className="ContentPage__book">{bookTitle}</p>

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
        </article>
      </div>

      <PrevNextNav navMap={nav} />
      {after}
    </>
  );
}

/**/
export default ContentShell;
