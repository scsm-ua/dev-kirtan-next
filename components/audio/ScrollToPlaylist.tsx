'use client';
import { useEffect } from 'react';

/**/
function ScrollToPlaylist() {
  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>('.Layout__content');
    if (scrollContainer && scrollContainer.scrollTop > 0) return;

    document
      .getElementById('audio-playlist')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return null;
}

/**/
export default ScrollToPlaylist;
