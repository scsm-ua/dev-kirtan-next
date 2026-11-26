import { defineDataHandler } from '@/lib/pageData/dataHandler';

/**/
export const dynamic = 'force-static';
export const dynamicParams = false;

/** Page data of the book root, root pages, songs and markdown pages. Needs only `contents.json`. */
const { generateStaticParams, GET } = defineDataHandler('');

/**/
export { generateStaticParams, GET };
