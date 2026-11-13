'use client';
import { useEffect } from 'react';
import Script from 'next/script';

import { trackPage } from '@/other/analytics';

import type { TAnalyticsPageType } from '@/other/analytics';

/**/
type Props = {
  bookId: string;
  itemId?: string;
  pageType?: TAnalyticsPageType;
};

/**
 * Loads gtag.js and keeps the page params (songbook, page type, item) current,
 * including after client-side navigations.
 */
export function GoogleAnalytics({ bookId, itemId, pageType }: Props) {
  const GA_ID = process.env.NEXT_PUBLIC_G_ID;

  useEffect(() => {
    trackPage({ bookId, itemId, pageType });
  }, [bookId, itemId, pageType]);

  if (!GA_ID) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="afterInteractive"
    />
  );
}
