import { getBookIdList } from '@/lib/books';
import { listAudioRoutes, respondWithPageData } from '@/lib/pageData';
import { getRouteFile, parseAudioFile } from '@/other/router/routes';

/**/
export const dynamic = 'force-static';
export const dynamicParams = false;

type TParams = { bookId: string; file: string };

/** The `audio/` prefix is the route segment, so strip it from the file name. */
export function generateStaticParams(): Array<TParams> {
  return getBookIdList().flatMap((bookId) =>
    listAudioRoutes(bookId).map((route) => ({
      bookId,
      file: getRouteFile(route).slice('audio/'.length)
    }))
  );
}

/** Page data of the audio index and the singer playlists. */
export async function GET(_request: Request, { params }: { params: Promise<TParams> }) {
  const { bookId, file } = await params;
  return respondWithPageData(parseAudioFile(bookId, file));
}
