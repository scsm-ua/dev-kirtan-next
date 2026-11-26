'use client';
/* eslint-disable @next/next/no-img-element */

import './Header.scss';
import CacheStatusButton from '@/components/common/CacheStatus/CacheStatusButton';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';
import HotkeyHint from '@/components/common/GlobalHotkeys/HotkeyHint';
import { getSongbookPath } from '@/other/paths';
import { PATH } from '@/other/constants';

import type { TAboutLink } from '@/types/pageData';

/**/
type Props = {
  about?: TAboutLink;  // Shows the info button that opens the About page.
  bookId: string;
  hideCacheStatus?: boolean;
};

/** Letter "i" in a circle. Inline: files in `public/images/svg` are cached as shell assets. */
function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width="22"
    >
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 11v6" />
      <circle cx="12" cy="7.5" fill="currentColor" r="0.6" />
    </svg>
  );
}

/**
 *
 */
function Header({ about, bookId, hideCacheStatus }: Props) {
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
            {about && (
              <a
                aria-label={about.title}
                className="Header__about"
                href={about.path}
                title={about.title}
              >
                <InfoIcon />
              </a>
            )}
            <FeedbackWidget bookId={bookId} />
          </div>
        </div>
      </div>
    </header>
  );
}

/**/
export default Header;
