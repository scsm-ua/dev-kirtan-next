import { getBookIdList } from '@/lib/books';
import { loadBookBundle } from '@/lib/pageData';

/**/
export const dynamic = 'force-static';
export const dynamicParams = false;

type TParams = { bookId: string };

/**/
export function generateStaticParams(): Array<TParams> {
  return getBookIdList().map((bookId) => ({ bookId }));
}

/** All page data of a songbook, for the service worker's offline precache. */
export async function GET(_request: Request, { params }: { params: Promise<TParams> }) {
  const { bookId } = await params;
  return Response.json(await loadBookBundle(bookId));
}
