import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SHOW_UNKNOWN_AUTHORS_KEY } from '@/components/authors/UnknownAuthors';
import { useGlobalHotkeys } from '@/other/hooks/useGlobalHotkeys';
import { notifyLocationChange } from '@/other/router/location';
import { navigate } from '@/other/router/navigate';

vi.mock('@/other/router/navigate', () => ({ navigate: vi.fn() }));

const onShowHelp = vi.fn();
let stopListening: Array<() => void>;

/** Renders the hook on the given page. */
function renderAt(path: string) {
  window.history.replaceState(null, '', path);
  return renderHook(() => useGlobalHotkeys({ onShowHelp }));
}

/** Presses a key; returns the event, to check whether its default action was prevented. */
function press(key: string, modifiers: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers });
  window.dispatchEvent(event);
  return event;
}

/** Collects the `detail` of every custom event with this name. */
function listen(name: string) {
  const listener = vi.fn((e: Event) => (e as CustomEvent).detail);
  window.addEventListener(name, listener);
  stopListening.push(() => window.removeEventListener(name, listener));
  return listener;
}

beforeEach(() => {
  stopListening = [];
  vi.mocked(navigate).mockClear();
  onShowHelp.mockClear();
});

afterEach(() => {
  stopListening.forEach((stop) => stop());
  document.body.innerHTML = '';
});

describe('useGlobalHotkeys', () => {
  it.each([
    ['b', '/en-pe/'],
    ['c', '/en-pe/contents/'],
    ['i', '/en-pe/a-z/'],
    ['s', '/en-pe/search/'],
    ['e', '/en-pe/export/'],
    ['a', '/en-pe/analyze/']
  ])('"%s" opens %s of the current book', (key, path) => {
    renderAt('/en-pe/some-song/');

    press(key);

    expect(navigate).toHaveBeenCalledExactlyOnceWith(path);
  });

  it('"h" shows the help and keeps the key from the browser', () => {
    renderAt('/en/contents/');

    expect(press('h').defaultPrevented).toBe(true);
    expect(onShowHelp).toHaveBeenCalledOnce();
  });

  it.each([
    ['1', 'all'],
    ['2', 'verse'],
    ['3', 'translation']
  ])('"%s" asks for the song view mode "%s"', (key, mode) => {
    const setMode = listen('kirtan:setMode');
    renderAt('/en/some-song/');

    press(key);

    expect(setMode).toHaveLastReturnedWith({ mode });
  });

  it.each([
    ['4', 'hide'],
    ['5', 'inline'],
    ['6', 'classical']
  ])('"%s" asks for the word-by-word mode "%s"', (key, wbwMode) => {
    const setWbwMode = listen('kirtan:setWbwMode');
    renderAt('/en/some-song/');

    press(key);

    expect(setWbwMode).toHaveLastReturnedWith({ wbwMode });
  });

  it.each([
    ['ArrowLeft', 'kirtan:prevSong'],
    ['ArrowRight', 'kirtan:nextSong']
  ])('"%s" sends %s and keeps the key from the browser', (key, name) => {
    const listener = listen(name);
    renderAt('/en/some-song/');

    expect(press(key).defaultPrevented).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  describe('"l"', () => {
    it('toggles the other translations on a song page', () => {
      const toggle = listen('kirtan:toggleOtherTranslations');
      renderAt('/en/some-song/');

      press('l');

      expect(toggle).toHaveBeenCalledOnce();
      expect(navigate).not.toHaveBeenCalled();
    });

    it.each(['/en/contents/', '/en/audio/some-singer/', '/en/'])('opens the book list on %s', (path) => {
      const toggle = listen('kirtan:toggleOtherTranslations');
      renderAt(path);

      press('l');

      expect(toggle).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledExactlyOnceWith('/en/');
    });
  });

  describe('"A"', () => {
    it('toggles the unknown authors on the authors page', () => {
      const toggle = listen('kirtan:toggleUnknownAuthors');
      renderAt('/en/authors/');

      press('A');

      expect(toggle).toHaveBeenCalledOnce();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('opens the authors page with the unknown authors shown from elsewhere', () => {
      renderAt('/en/contents/');

      press('A');

      expect(sessionStorage.getItem(SHOW_UNKNOWN_AUTHORS_KEY)).toBe('1');
      expect(navigate).toHaveBeenCalledExactlyOnceWith('/en/authors/');
    });
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Alt', { altKey: true }]
  ])('leaves keys pressed with %s to the browser', (_name, modifiers) => {
    renderAt('/en/contents/');

    expect(press('h', modifiers).defaultPrevented).toBe(false);
    press('c', modifiers);

    expect(onShowHelp).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each(['input', 'textarea'])('leaves keys typed into an %s alone', (tag) => {
    const field = document.body.appendChild(document.createElement(tag));
    field.focus();
    renderAt('/en/contents/');

    press('c');
    press('h');

    expect(navigate).not.toHaveBeenCalled();
    expect(onShowHelp).not.toHaveBeenCalled();
  });

  it('leaves a key that another handler already took', () => {
    const take = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', take);
    stopListening.push(() => window.removeEventListener('keydown', take));
    renderAt('/en/contents/');

    press('c');

    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the help when another component asks for it', () => {
    renderAt('/en/contents/');

    window.dispatchEvent(new CustomEvent('kirtan:showHelp'));

    expect(onShowHelp).toHaveBeenCalledOnce();
  });

  it('uses the book of the page the user moved to', () => {
    renderAt('/en/contents/');

    act(() => {
      window.history.pushState(null, '', '/ua/contents/');
      notifyLocationChange();
    });
    press('s');

    expect(navigate).toHaveBeenCalledExactlyOnceWith('/ua/search/');
  });

  it('stops listening when unmounted', () => {
    const { unmount } = renderAt('/en/contents/');
    unmount();

    press('c');
    window.dispatchEvent(new CustomEvent('kirtan:showHelp'));

    expect(navigate).not.toHaveBeenCalled();
    expect(onShowHelp).not.toHaveBeenCalled();
  });

  describe('focus', () => {
    const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

    /** The page scrolls inside this element, so it needs the focus for the scroll keys to work. */
    function addScroller() {
      const scroller = document.body.appendChild(document.createElement('div'));
      scroller.className = 'Layout__content';
      scroller.tabIndex = -1;
      return scroller;
    }

    it('gives the focus to the scroll container, so the scroll keys work', async () => {
      const scroller = addScroller();
      renderAt('/en/contents/');

      await tick();

      expect(document.activeElement).toBe(scroller);
    });

    it('leaves the focus where a page put it', async () => {
      addScroller();
      const field = document.body.appendChild(document.createElement('input'));
      field.focus();
      renderAt('/en/search/');

      await tick();

      expect(document.activeElement).toBe(field);
    });
  });
});
