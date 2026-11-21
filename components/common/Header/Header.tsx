'use client';
/* eslint-disable @next/next/no-img-element */

import './Header.scss';
import CacheStatusButton from '@/components/common/CacheStatus/CacheStatusButton';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';
import HotkeyHint from '@/components/common/GlobalHotkeys/HotkeyHint';
import { getSongbookPath } from '@/other/paths';
import { PATH } from '@/other/constants';

/**
 *
 */
function Header({ bookId, hideCacheStatus }: { bookId: string; hideCacheStatus?: boolean }) {
  const href = getSongbookPath(bookId);

  return (
    <header className="Header">
      <div className="Header__container">
        <div className="Header__content">
          <a href={href} className="Header__home">
            <img
              alt="Home"
              className="Header__logo"
              src={PATH.IMG.LOGO}
            />
          </a>

          <div className="Header__actions">
            {!hideCacheStatus && <CacheStatusButton bookId={bookId} />}
            <HotkeyHint />
            <FeedbackWidget bookId={bookId} />
          </div>
        </div>
      </div>
    </header>
  );
}

/**/
export default Header;
