import { getBookIdList } from '@/lib/books';
import PrefRedirect from '@/components/home/PrefRedirect';

/**
 *
 */
export default async function Home() {
  const bookIdList = getBookIdList();

  return (
    <html lang="en">
      <body>
        <PrefRedirect bookIdList={bookIdList} />
      </body>
    </html>
  );
}
