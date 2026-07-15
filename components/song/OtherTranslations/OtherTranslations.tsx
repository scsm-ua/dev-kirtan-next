'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';

import './OtherTranslations.scss';
import AppModal from '@/components/common/Modal/AppModal';
import { translate } from '@/other/i18n';
import { getBookLangLabel } from '@/other/helpers';

/**/
type Props = {
  bookId: string;
  children: ReactNode;
  disabled: boolean;
};

/**
 *
 */
function OtherTranslations({ bookId, children, disabled }: Props) {
  const [isOpen, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const focusedIdx = useRef(-1);

  useEffect(() => {
    const handler = () => {
      if (!disabled) setOpen((v) => !v);
    };
    window.addEventListener('kirtan:toggleOtherTranslations', handler);
    return () => window.removeEventListener('kirtan:toggleOtherTranslations', handler);
  }, [disabled]);

  // Keyboard cursor navigation.
  useEffect(() => {
    if (!isOpen) {
      focusedIdx.current = -1;
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();

      const links = Array.from(
        listRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []
      );
      if (!links.length) return;

      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const isInitial = focusedIdx.current === -1;
      focusedIdx.current = isInitial
        ? dir === 1
          ? 0
          : links.length - 1
        : (focusedIdx.current + dir + links.length) % links.length;
      links[focusedIdx.current].focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        className="NoBorderButton OtherTranslations__button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title={translate(bookId, 'SONG_PAGE.OTHER_TRANSLATIONS')}
      >
        <span className="OtherTranslations__label">{getBookLangLabel(bookId)}</span>
      </button>

      <AppModal header=" " isOpen={isOpen} onClose={() => setOpen(false)}>
        <div ref={listRef}>{children}</div>
      </AppModal>
    </>
  );
}

/**/
export default OtherTranslations;
