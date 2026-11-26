/**
 * Google Analytics helpers. All no-ops without `NEXT_PUBLIC_G_ID` or on the server.
 */

import type { SONGBOOK_PAGE } from '@/other/paths';
import type { TPageKind } from '@/types/pageData';

/** `page_type` values: the kind of an app page, or the segment of a full-load page (analyze, export). */
export type TAnalyticsPageType = TPageKind | (typeof SONGBOOK_PAGE)[keyof typeof SONGBOOK_PAGE];

export type TAnalyticsParams = Record<string, string | number | undefined>;

type TWindow = Window & { dataLayer?: unknown[]; isGaInit?: boolean };

const GA_ID = process.env.NEXT_PUBLIC_G_ID;

/** gtag.js only understands `arguments` objects in the data layer, not arrays. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: unknown[]): void {
  const w = window as TWindow;
  w.dataLayer = w.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments);
}

/**
 * Sets page params on the GA config; they're attached to every event (page_view,
 * enhanced measurement, custom). The first call sends GA's own page_view; later
 * calls come from client navigations and send one explicitly, after the URL and
 * title were updated.
 */
export function trackPage(params: {
  bookId: string;
  itemId?: string;
  pageType?: TAnalyticsPageType;
}): void {
  if (!GA_ID || typeof window === 'undefined') return;

  const { bookId, itemId, pageType } = params;
  const w = window as TWindow;
  const isFirst = !w.isGaInit;
  if (isFirst) {
    w.isGaInit = true;
    gtag('js', new Date());
  }

  gtag('config', GA_ID, {
    songbook: bookId,
    page_type: pageType,
    item_id: itemId,
    ...(isFirst ? {} : { send_page_view: false })
  });

  if (!isFirst) {
    gtag('event', 'page_view', {
      page_location: window.location.href,
      page_title: document.title
    });
  }
}

/**/
export function trackEvent(name: string, params: TAnalyticsParams = {}): void {
  if (!GA_ID || typeof window === 'undefined') return;
  gtag('event', name, params);
}
