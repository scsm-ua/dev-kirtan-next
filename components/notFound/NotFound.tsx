'use client';
import { useEffect, useState } from 'react';

import './NotFoundPage.scss';

import { DEFAULT_LANGUAGE, isValidBookId, translate } from '@/other/i18n';
import Layout from '@/components/common/Layout/Layout';
import { PATH, PREFERENCES } from '@/other/constants';
import SongBookItem from '@/components/song/OtherTranslations/SongBookItem';

import type { TBookDescription } from '@/types/book';

/**/
type Props = {
  booksMap: Record<string, TBookDescription>;
};

/**
 *
 */
function getBookId(): string {
  const _bookId = location.pathname.split('/')[1];
  if (isValidBookId(_bookId)) return _bookId;

  return (
    localStorage.getItem(PREFERENCES.PREFERRED_BOOK_ID) ||
    navigator.language.slice(0, 2) ||
    Intl.DateTimeFormat().resolvedOptions().locale?.slice(0, 2) ||
    DEFAULT_LANGUAGE
  );
}

/**
 * Check if user is attempting to open the old site href (they'd end with `.html`).
 * If we have the new version of the page (`.html` free), redirect them. If no -- just
 * display the 404 page.
 */
async function checkOldPath(): Promise<true | void> {
  if (!window.location.pathname.endsWith('.html')) return;

  const newPath = window.location.pathname.split('.')[0];
  const url = window.location.host.startsWith('localhost')
    ? window.location.host + newPath // Local debug case
    : newPath;

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
      hasOldPath || setBookId(getBookId())
    );
  }, []);

  if (bookId === null) return null;

  const bookList = Object.entries(booksMap)
    .sort((a) => (a[0] === bookId ? -1 : 1))
    .map((ent: [string, TBookDescription]) => ent[1]);

  return (
    <Layout bookId={bookId} className="NotFoundPage">
      <div className="Main__container IndexPage__container">
        <div className="Main__content IndexPage__content">
          <header className="NotFoundPage__header">
            <h3 className="NotFoundPage__title">
              {translate('bookId', 'NOT_FOUND_PAGE.TITLE')}
            </h3>

            <div className="NotFoundPage__text">
              {translate('bookId', 'NOT_FOUND_PAGE.TEXT')}
            </div>
          </header>

          <main className="NotFoundPage__main">
            <ul className="NotFoundPage__list">
              {bookList.map((description: TBookDescription) => {
                const href = `/${description.slug}/${PATH.PAGE.A_Z}`;

                return (
                  <SongBookItem
                    description={description}
                    href={href}
                    key={description.slug}
                  />
                );
              })}
            </ul>
          </main>
        </div>
      </div>
    </Layout>
  );
}

/**/
export default NotFound;
