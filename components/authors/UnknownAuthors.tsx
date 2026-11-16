'use client';
import { ReactNode, useEffect, useState } from 'react';

export const SHOW_UNKNOWN_AUTHORS_KEY = 'kirtan:showUnknownAuthors';

/**/
type Props = {
  children: ReactNode;
};

/**
 * Hidden by default; toggled by Shift+A (`kirtan:toggleUnknownAuthors`).
 */
function UnknownAuthors({ children }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Set by the Shift+A hotkey when navigating here from another page.
    if (sessionStorage.getItem(SHOW_UNKNOWN_AUTHORS_KEY)) {
      sessionStorage.removeItem(SHOW_UNKNOWN_AUTHORS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Consume the one-shot hotkey flag after hydration to keep SSR output deterministic.
      setVisible(true);
    }

    const handler = () => setVisible((v) => !v);
    window.addEventListener('kirtan:toggleUnknownAuthors', handler);
    return () => window.removeEventListener('kirtan:toggleUnknownAuthors', handler);
  }, []);

  return visible ? children : null;
}

/**/
export default UnknownAuthors;
