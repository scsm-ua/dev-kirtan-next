'use client';
import { useEffect, useState } from 'react';

import './NotFoundPage.scss';

import { DEFAULT_LANGUAGE, translate } from '@/other/i18n';
import Layout from '@/components/common/Layout/Layout';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { PREFERENCES } from '@/other/constants';
import SongBookItem from '@/components/song/OtherTranslations/SongBookItem';

import type { TBookDescription } from '@/types/book';

/**/
type Props = {
  booksMap: Record<string, TBookDescription>;
};

/**
 *
 */
function getBookId(booksMap: Props['booksMap']): string {
  const candidates = [
    location.pathname.split('/')[1],
    localStorage.getItem(PREFERENCES.PREFERRED_BOOK_ID),
    (navigator.language || Intl.DateTimeFormat().resolvedOptions().locale)?.slice(0, 2)
  ];

  return candidates.find((id) => id && booksMap[id]) ?? DEFAULT_LANGUAGE;
}

/**
 * Check if user is attempting to open the old site href (they'd end with `.html`).
 * If we have the new version of the page (`.html` free), redirect them. If no -- just
 * display the 404 page.
 */
async function checkOldPath(): Promise<true | void> {
  if (!window.location.pathname.endsWith('.html')) return;

  const url = window.location.pathname.split('.')[0];

  const resp = await fetch(url, { method: 'HEAD' });

  if (resp.ok) {
    window.location.href = url;
    return true;
  }
}

/**
 *
 */
function NotFound({ booksMap }: Props) {
  const [bookId, setBookId] = useState<string | null>(null);

  useEffect(() => {
    checkOldPath().then((hasOldPath) =>
      hasOldPath || setBookId(getBookId(booksMap))
    );
  }, [booksMap]);

  if (bookId === null) return null;

  const bookList = Object.values(booksMap).sort(
    (a, b) => Number(b.slug === bookId) - Number(a.slug === bookId)
  );

  return (
    <Layout bookId={bookId} className="NotFoundPage">
      <div className="Main__container IndexPage__container">
        <div className="Main__content IndexPage__content">
          <header className="NotFoundPage__header">
            <h3 className="NotFoundPage__title">
              {translate(bookId, 'NOT_FOUND_PAGE.TITLE')}
            </h3>

            <div className="NotFoundPage__text">
              {translate(bookId, 'NOT_FOUND_PAGE.TEXT')}
            </div>
          </header>

          <div className="NotFoundPage__main">
            <ul className="NotFoundPage__list">
              {bookList.map((description: TBookDescription) => {
                const href = getSongbookPagePath(
                  description.slug,
                  SONGBOOK_PAGE.A_Z
                );

                return (
                  <SongBookItem
                    description={description}
                    href={href}
                    key={description.slug}
                  />
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**/
export default NotFound;
