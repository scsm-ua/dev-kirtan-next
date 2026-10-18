import '../styles/index.scss';
import { getBooksMap } from '@/lib/books';
import NotFound from '@/components/notFound/NotFound';

/**
 *
 */
async function NotFoundPage() {
  const booksMap = getBooksMap();
  return <NotFound booksMap={booksMap} />;
}

/**/
export default NotFoundPage;
