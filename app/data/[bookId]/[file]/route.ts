import { getBookIdList } from '@/lib/books';
import { listItemRoutes, respondWithPageData } from '@/lib/pageData';
import { getRouteFile, parseItemFile } from '@/other/router/routes';

/**/
export const dynamic = 'force-static';
export const dynamicParams = false;

type TParams = { bookId: string; file: string };

/** Both params come from this leaf, so one call lists every file. */
export function generateStaticParams(): Array<TParams> {
  return getBookIdList().flatMap((bookId) =>
    listItemRoutes(bookId).map((route) => ({ bookId, file: getRouteFile(route) }))
  );
}

/** Page data of the book root, root pages, songs and markdown pages. */
export async function GET(_request: Request, { params }: { params: Promise<TParams> }) {
  const { bookId, file } = await params;
  return respondWithPageData(parseItemFile(bookId, file));
}
