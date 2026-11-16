'use client';
import { useEffect } from 'react';

import Loader from '@/components/common/Loader/Loader';
import { getBookLocale } from '@/other/helpers';
import { PREFERENCES } from '@/other/constants';

/**
 *
 */
function PrefRedirect({ bookIdList }: { bookIdList: string[] }) {
  useEffect(() => {
    try {
      handleBookId(
        localStorage.getItem(PREFERENCES.PREFERRED_BOOK_ID),
        bookIdList
      );
    } catch (e) {
      console.error(e);
    }
  }, [bookIdList]);

  return <Loader />;
}

/**
 *
 */
function handleBookId(preservedBookId: string, bookIdList: string[]) {
  if (preservedBookId && bookIdList.includes(preservedBookId)) {
    makeRedirectTo(preservedBookId);
  } else {
    const lang = (
      navigator.language || Intl.DateTimeFormat().resolvedOptions().locale
    ).slice(0, 2);
    // Book ids are not always language codes (`ua` is `uk`).
    const bookId = bookIdList.includes(lang)
      ? lang
      : bookIdList.find((id) => !id.includes('-') && getBookLocale(id) === lang);

    makeRedirectTo(bookId ?? 'en');
  }
}

/**
 *
 */
function makeRedirectTo(bookId) {
  window.location.href = '/' + bookId + '/';
}

/**/
export default PrefRedirect;
