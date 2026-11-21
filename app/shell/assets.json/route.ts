import { getSharedAssets } from '@/lib/pageData';

/**/
export const dynamic = 'force-static';

/** Logos and covers of all songbooks: the service worker caches them on install, with the shell. */
export function GET() {
  return Response.json(getSharedAssets());
}
