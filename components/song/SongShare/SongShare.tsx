'use client';
import { lazy, useState } from 'react';

import './SongShare.scss';
import AppModal from '@/components/common/Modal/AppModal';
import { translate } from '@/other/i18n';

/**/
type Props = {
  bookId: string;
};

const Form = lazy(() => import('./SongShareForm'));

/**
 *
 */
function SongShare({ bookId }: Props) {
  const [isOpen, setOpen] = useState(false);

  return (
    <>
      <button
        className="NoBorderButton SongShare__button"
        onClick={() => setOpen(true)}
        title={translate(bookId, 'SONG_PAGE.SHARE_SONG')}
      >
        <span className="icon-arrow-up-from-bracket" />
      </button>

      <AppModal
        header={translate(bookId, 'SONG_PAGE.SHARE')}
        isOpen={isOpen}
        onClose={() => setOpen(false)}
      >
        <Form bookId={bookId} onClose={() => setOpen(false)} />
      </AppModal>
    </>
  );
}

/**/
export default SongShare;
