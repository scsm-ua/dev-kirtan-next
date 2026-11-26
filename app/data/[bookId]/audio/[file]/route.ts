import { defineDataHandler } from '@/lib/pageData/dataHandler';
import { SONGBOOK_PAGE } from '@/other/paths';

/**/
export const dynamic = 'force-static';
export const dynamicParams = false;

/** Page data of the audio index and the singer playlists. Scans the songs, so it is kept apart. */
const { generateStaticParams, GET } = defineDataHandler(SONGBOOK_PAGE.AUDIO);

/**/
export { generateStaticParams, GET };
