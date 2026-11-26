import { audioRoute } from '@/lib/pageData/routes/audio';
import { audioSingerRoute } from '@/lib/pageData/routes/audioSinger';
import { authorsRoute } from '@/lib/pageData/routes/authors';
import { azRoute } from '@/lib/pageData/routes/az';
import { bookListRoute } from '@/lib/pageData/routes/bookList';
import { contentsRoute } from '@/lib/pageData/routes/contents';
import { itemRoute } from '@/lib/pageData/routes/item';
import { otherRoute } from '@/lib/pageData/routes/other';
import { searchRoute } from '@/lib/pageData/routes/search';
import { ROUTE_KIND } from '@/other/router/routes';

import type { TRouteKind, TServerRoute } from '@/lib/pageData/routes/types';

/** Build side of every route of the URL table (`other/router/routes.ts`); a missing kind is a type error. */
// prettier-ignore
export const SERVER_ROUTES: { [K in TRouteKind]: TServerRoute<K> } = {
  [ROUTE_KIND.BOOK_LIST]:    bookListRoute,
  [ROUTE_KIND.OTHER]:        otherRoute,
  [ROUTE_KIND.CONTENTS]:     contentsRoute,
  [ROUTE_KIND.A_Z]:          azRoute,
  [ROUTE_KIND.AUTHORS]:      authorsRoute,
  [ROUTE_KIND.SEARCH]:       searchRoute,
  [ROUTE_KIND.AUDIO]:        audioRoute,
  [ROUTE_KIND.AUDIO_SINGER]: audioSingerRoute,
  [ROUTE_KIND.ITEM]:         itemRoute
};
