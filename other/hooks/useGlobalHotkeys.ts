'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { VIEW_MODE, WBW_MODE } from '@/types/common';
import type { TViewMode, TWbwMode } from '@/types/common';

const KEY_TO_MODE: Record<string, TViewMode> = {
  '1': VIEW_MODE.ALL,
  '2': VIEW_MODE.VERSE,
  '3': VIEW_MODE.TRANSLATION,
};

const KEY_TO_WBW: Record<string, TWbwMode> = {
  '4': WBW_MODE.HIDE,
  '5': WBW_MODE.INLINE,
  '6': WBW_MODE.CLASSICAL,
};

const NON_SONG_SEGMENTS = new Set(['contents', 'a-z', 'search', 'authors', 'export']);

function isInputFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || el.isContentEditable;
}

type Config = {
  onShowHelp: () => void;
};

export function useGlobalHotkeys({ onShowHelp }: Config): void {
  const router = useRouter();
  const pathname = usePathname();

  // Focus the main scroll container on every route change so the browser
  // natively handles ArrowUp/ArrowDown/PageUp/PageDown/Home/End/Space scrolling.
  // body has overflow:hidden — the scroller is .Layout__content.
  // Deferred to the next tick so per-page autofocus (e.g. SearchControls input)
  // runs first; we only claim focus if nothing else did.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body) return;
      const scroller = document.querySelector<HTMLElement>('.Layout__content');
      scroller?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    const bookId = segments[0] ?? '';
    const subPage = segments[1];
    const isSongPage =
      segments.length === 2 &&
      subPage !== undefined &&
      !NON_SONG_SEGMENTS.has(subPage);

    function handleKeyDown(e: KeyboardEvent): void {
      if (isInputFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Skip if an earlier listener (e.g. BookListKeyNav, OtherTranslations) already handled the key.
      if (e.defaultPrevented) return;

      switch (e.key) {
        case 'h':
          e.preventDefault();
          onShowHelp();
          break;

        case 'b':
          router.push(`/${bookId}`);
          break;

        case 'c':
          router.push(`/${bookId}/contents`);
          break;

        case 'i':
          router.push(`/${bookId}/a-z`);
          break;

        case 's':
          router.push(`/${bookId}/search`);
          break;

        case 'e':
          router.push(`/${bookId}/export`);
          break;

        case 'l':
          if (isSongPage) {
            window.dispatchEvent(new CustomEvent('kirtan:toggleOtherTranslations'));
          } else {
            router.push(`/${bookId}`);
          }
          break;

        case '1':
        case '2':
        case '3':
          window.dispatchEvent(
            new CustomEvent('kirtan:setMode', {
              detail: { mode: KEY_TO_MODE[e.key] },
            })
          );
          break;

        case '4':
        case '5':
        case '6':
          window.dispatchEvent(
            new CustomEvent('kirtan:setWbwMode', {
              detail: { wbwMode: KEY_TO_WBW[e.key] },
            })
          );
          break;

        case 'ArrowLeft':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('kirtan:prevSong'));
          break;

        case 'ArrowRight':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('kirtan:nextSong'));
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pathname, router, onShowHelp]);

  // Allow other components (e.g. HotkeyHint in the Header) to open the modal
  // without prop-drilling through server components.
  useEffect(() => {
    const handler = () => onShowHelp();
    window.addEventListener('kirtan:showHelp', handler);
    return () => window.removeEventListener('kirtan:showHelp', handler);
  }, [onShowHelp]);
}
