import { getBookIdList } from '@/lib/books';
import { listRoutes, respondWithPageData } from '@/lib/pageData';
import { getRouteFile, parseDataFile } from '@/other/router/routes';

type TParams = { bookId: string; file: string };

/**
 * Body of a JSON handler `app/data/[bookId]/<folder>/[file]/route.ts`: it
 * emits the page data of every route whose data file is in that folder
 * (`''` for `/data/<bookId>/` itself).
 */
export function defineDataHandler(folder: string) {
  // The folder is a route segment, so the `file` param is the name without it.
  const prefix = folder ? `${folder}/` : '';

  return {
    /** Both params come from this leaf, so one call lists every file. */
    generateStaticParams(): Array<TParams> {
      return getBookIdList().flatMap((bookId) =>
        listRoutes(bookId, folder).map((route) => ({
          bookId,
          file: getRouteFile(route).slice(prefix.length)
        }))
      );
    },

    /**/
    async GET(_request: Request, { params }: { params: Promise<TParams> }): Promise<Response> {
      const { bookId, file } = await params;
      return respondWithPageData(parseDataFile(bookId, prefix + file));
    }
  };
}
