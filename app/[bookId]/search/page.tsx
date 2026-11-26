import { definePage } from '@/lib/pageData/page';
import { ROUTE_KIND } from '@/other/router/routes';

const { generateMetadata, generateStaticParams, Page } = definePage(ROUTE_KIND.SEARCH);

/**/
export { generateMetadata, generateStaticParams };
export default Page;
