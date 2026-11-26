'use client';

import './AppRoot.scss';
import LayoutChrome from '@/components/common/Layout/LayoutChrome';
import PlayerDock from '@/components/player/PlayerDock';
import {
  getChrome,
  getPrefetchPaths,
  isPrecachePage,
  renderView
} from '@/components/app/views/registry';
import { getRoutePath } from '@/other/router/routes';
import { isInitialPage, useAppRouter } from '@/other/router/useAppRouter';
import { PagePathContext } from '@/other/router/pagePath';
import { usePrecacheBook } from '@/other/router/precache';

import type { ReactNode } from 'react';
import type { TPageData } from '@/types/pageData';

/**/
type Props = {
  extras?: ReactNode;
  initial: TPageData | null;  // `null` in the offline shell.
};

/**
 * Client root of every reader page: the persistent chrome plus the view of
 * the current page data. Internal links render here without a reload.
 */
function AppRoot({ extras, initial }: Props) {
  const { isFailed, isLoading, page } = useAppRouter(initial, getPrefetchPaths);
  // Some pages (the songbook list) start no book job, see `precache` in the views registry. The hook cannot sit inside an `if`
  // (rules of hooks), so `undefined` means "no book". Changing from a book id
  // to `undefined` also runs the hook's cleanup for the book the reader left:
  // it unregisters that book and cancels its precache if not yet started.
  usePrecacheBook(page && isPrecachePage(page) ? page.route.bookId : undefined);

  return (
    <>
      {(isLoading || (!page && !isFailed)) && (
        <div aria-hidden="true" className="AppRoot__progress" />
      )}

      {page && (
        <LayoutChrome {...getChrome(page)}>
          <PagePathContext value={getRoutePath(page.route)}>
            {renderView(page, isInitialPage(page, initial) ? extras : undefined)}
          </PagePathContext>
        </LayoutChrome>
      )}

      {isFailed && (
        <main className="AppRoot__offline">
          <h1>You&apos;re offline</h1>
          <p>This page hasn&apos;t been saved for offline use yet.</p>
          <button onClick={() => history.back()} type="button">← Go back</button>
        </main>
      )}

      {/* Outside the views, so playback survives navigation. */}
      <PlayerDock />
    </>
  );
}

/**/
export default AppRoot;
