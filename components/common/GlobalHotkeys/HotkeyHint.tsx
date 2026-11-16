'use client';
import { useEffect, useState } from 'react';

import './HotkeyHint.scss';

const LS_KEY = 'kirtan:hotkeys-hint-ts';
const HOTKEYS_HINT_PERIOD = 7 * 24 * 3600 * 1000;
const VISIBLE_MS = 10 * 1000;   // total time on screen
const FADE_OUT_MS = 500;        // fade-out duration, matches CSS

/**/
/**
 * Inline hint rendered in the Header to the left of the Feedback button.
 * Shown once per hour on desktop. Clicking dispatches kirtan:showHelp so the
 * modal can open without prop-drilling through server components.
 */
function HotkeyHint() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (/Mobi|Android/i.test(navigator.userAgent)) return;

    const last = Number(localStorage.getItem(LS_KEY) ?? 0);
    if (Date.now() - last < HOTKEYS_HINT_PERIOD) return;

    localStorage.setItem(LS_KEY, String(Date.now()));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The hint is shown only after reading browser storage on the client.
    setVisible(true);

    const fadeId = window.setTimeout(() => setFading(true), VISIBLE_MS - FADE_OUT_MS);
    const hideId = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => { window.clearTimeout(fadeId); window.clearTimeout(hideId); };
  }, []);

  if (!visible) return null;

  const handleClick = () => {
    setVisible(false);
    window.dispatchEvent(new CustomEvent('kirtan:showHelp'));
  };

  return (
    <button
      className={`HotkeyHint${fading ? ' HotkeyHint--fading' : ''}`}
      onClick={handleClick}
    >
      <kbd className="HotkeyHint__key">h</kbd>
      <span className="HotkeyHint__label">hotkeys</span>
    </button>
  );
}

/**/
export default HotkeyHint;
