import { definePage } from '@/lib/pageData/page';
import { ROUTE_KIND } from '@/other/router/routes';

/**/
export const dynamicParams = false;

const { generateMetadata, generateStaticParams, Page } = definePage(ROUTE_KIND.OTHER);

/**/
export { generateMetadata, generateStaticParams };
export default Page;
