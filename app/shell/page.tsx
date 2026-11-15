import AppDocument from '@/components/app/AppDocument';

import type { Metadata } from 'next';

/**/
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

/**
 * Empty app document. The service worker serves it offline for app pages
 * whose HTML isn't cached; the app then renders from cached page data.
 */
export default function ShellPage() {
  return <AppDocument page={null} />;
}
