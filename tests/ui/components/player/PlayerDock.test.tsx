import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlayerDock from '@/components/player/PlayerDock';
import PlayerWidget from '@/components/player/PlayerWidget';
import { translate } from '@/other/i18n';
import { useIsOnline } from '@/other/hooks/useIsOnline';
import { formatTime } from '@/other/player/formatTime';
import { RESTART_THRESHOLD } from '@/other/player/PlayerManager';
import { navigate } from '@/other/router/navigate';
import { PagePathContext } from '@/other/router/pagePath';
import { stubBrowserApis } from '@/tests/helpers/app';
import { getBookIds } from '@/tests/helpers/books';
import { FAKE_TYPE, fakeUrl, getFakeAdapter } from '@/tests/helpers/player';
import { closePlayerPage, sourceSays, trackTitle } from '@/tests/helpers/playerPage';

vi.mock('@/other/router/navigate', () => ({ navigate: vi.fn() }));
vi.mock('@/other/hooks/useIsOnline', () => ({ useIsOnline: vi.fn(() => true) }));

const PAGE_PATH = '/test/page/';
const [bookId] = getBookIds();

/** A page with players `a`, `b`, `c` and the dock, which outlives the page. */
function Page({ showPlayers = true }: { showPlayers?: boolean }) {
  return (
    <>
      {showPlayers && (
        <PagePathContext.Provider value={PAGE_PATH}>
          {['a', 'b', 'c'].map((name) => (
            <PlayerWidget
              className={`Test__${name}`}
              key={name}
              source={{ type: FAKE_TYPE, url: fakeUrl(name) }}
              subtitle={`Subtitle ${name}`}
              title={trackTitle(name)}
              trackInfo={{ bookId, pageType: 'playlist', singer: 'S', title: 'T' }}
            />
          ))}
        </PagePathContext.Provider>
      )}
      <PlayerDock />
    </>
  );
}

// Queried by selector: the hidden dock is `inert`, which Testing Library skips even with `hidden`.
const dock = () => document.querySelector<HTMLElement>('.PlayerDock[role="region"][aria-label="Now playing"]');
const button = (name: string) => within(dock()).getByRole('button', { name, hidden: true });
const titleButton = () => within(dock()).getByTitle('Show in list');
const inDock = (selector: string) => dock().querySelector(selector);

function play(name: string) {
  fireEvent.click(document.querySelector(`.Test__${name} button`));
  sourceSays(name, (events) => events.onStatus('playing'));
}

beforeEach(() => {
  stubBrowserApis();
  vi.mocked(navigate).mockClear();
  vi.mocked(useIsOnline).mockReturnValue(true);
});

afterEach(async () => {
  await closePlayerPage();
  vi.unstubAllGlobals();
});

describe('PlayerDock', () => {
  it('is hidden and empty until something plays', () => {
    render(<Page />);

    expect(dock().getAttribute('aria-hidden')).toBe('true');
    expect(dock().hasAttribute('inert')).toBe(true);
    expect(inDock('.PlayerDock__inner')).toBeNull();
    expect(document.documentElement.classList.contains('has-player-dock')).toBe(false);
  });

  it('shows the playing track with its subtitle, and marks the page for the layout', () => {
    render(<Page />);
    play('b');

    expect(dock().getAttribute('aria-hidden')).toBe('false');
    expect(dock().hasAttribute('inert')).toBe(false);
    expect(inDock('.PlayerDock__marquee').textContent).toBe(`${trackTitle('b')} · Subtitle b`);
    expect(button('Pause')).toBeTruthy();
    expect(document.documentElement.classList.contains('has-player-dock')).toBe(true);
  });

  it('closes on X: stops the track and unmarks the page', () => {
    render(<Page />);
    play('a');
    fireEvent.click(button('Close player'));

    expect(getFakeAdapter('a').pause).toHaveBeenCalledOnce();
    expect(dock().getAttribute('aria-hidden')).toBe('true');
    expect(document.documentElement.classList.contains('has-player-dock')).toBe(false);
    // The last track stays in the dock while it slides out.
    expect(inDock('.PlayerDock__name').textContent).toBe(trackTitle('a'));
  });

  it('pauses and plays the track', () => {
    render(<Page />);
    play('a');
    fireEvent.click(button('Pause'));
    sourceSays('a', (events) => events.onStatus('paused'));
    fireEvent.click(button('Play'));

    expect(getFakeAdapter('a').pause).toHaveBeenCalledOnce();
    expect(getFakeAdapter('a').play).toHaveBeenCalledTimes(2);
  });

  describe('previous and next', () => {
    it('are off at the ends of the page', () => {
      render(<Page />);
      play('a');
      expect((button('Previous track') as HTMLButtonElement).disabled).toBe(true);
      expect((button('Next track') as HTMLButtonElement).disabled).toBe(false);

      play('c');
      expect((button('Previous track') as HTMLButtonElement).disabled).toBe(false);
      expect((button('Next track') as HTMLButtonElement).disabled).toBe(true);
    });

    it('"next" plays the next player of the page', () => {
      render(<Page />);
      play('a');
      fireEvent.click(button('Next track'));

      expect(getFakeAdapter('b').play).toHaveBeenCalledOnce();
      expect(inDock('.PlayerDock__name').textContent).toBe(trackTitle('b'));
    });

    it('"previous" restarts the first track once it has played a while', () => {
      render(<Page />);
      play('a');
      sourceSays('a', (events) => events.onProgress(RESTART_THRESHOLD + 1, 100));
      fireEvent.click(button('Previous track'));

      expect((button('Previous track') as HTMLButtonElement).disabled).toBe(false);
      expect(getFakeAdapter('a').seek).toHaveBeenLastCalledWith(0);
    });
  });

  describe('time', () => {
    it('shows the position and the duration; skipping waits for the duration', () => {
      render(<Page />);
      play('a');
      expect((button('Forward 5 seconds') as HTMLButtonElement).disabled).toBe(true);
      expect((button('Back 5 seconds') as HTMLButtonElement).disabled).toBe(true);

      sourceSays('a', (events) => events.onProgress(62, 245));

      expect([...dock().querySelectorAll('.PlayerDock__time')].map((el) => el.textContent)).toEqual([
        formatTime(62),
        formatTime(245)
      ]);
      expect(screen.getByRole('slider', { name: trackTitle('a'), hidden: true }).getAttribute('aria-valuenow')).toBe(
        '62'
      );
    });

    it('skips 5 seconds back and forth, and seeks from the slider', () => {
      render(<Page />);
      play('a');
      sourceSays('a', (events) => events.onProgress(62, 245));

      fireEvent.click(button('Forward 5 seconds'));
      fireEvent.click(button('Back 5 seconds'));
      fireEvent.keyDown(screen.getByRole('slider', { hidden: true }), { key: 'Home' });

      expect(getFakeAdapter('a').seek.mock.calls).toEqual([[67], [57], [0]]);
    });
  });

  it('has a link to open the source', () => {
    render(<Page />);
    play('a');
    const link = inDock('a.PlayerDock__action');

    expect(link.getAttribute('href')).toBe(fakeUrl('a'));
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  describe('after the page is left', () => {
    it('keeps playing, with prev/next of that page', () => {
      const { rerender } = render(<Page />);
      play('b');
      rerender(<Page showPlayers={false} />);
      act(() => {});

      expect(dock().getAttribute('aria-hidden')).toBe('false');
      expect(getFakeAdapter('b').destroy).not.toHaveBeenCalled();
      expect((button('Next track') as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(button('Next track'));
      expect(getFakeAdapter('c').play).toHaveBeenCalledOnce();
    });

    it('the title leads back to the page of the track', async () => {
      const { rerender } = render(<Page />);
      play('b');
      rerender(<Page showPlayers={false} />);
      await act(async () => {});
      fireEvent.click(titleButton());

      expect(navigate).toHaveBeenCalledExactlyOnceWith(PAGE_PATH);
    });

    it('the title on the same page does not navigate', () => {
      render(<Page />);
      play('b');
      expect(titleButton().getAttribute('role')).toBe('button');
      fireEvent.keyDown(titleButton(), { key: 'Enter' });

      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('says when the device is offline, only while shown', () => {
    vi.mocked(useIsOnline).mockReturnValue(false);
    render(<Page />);
    expect(inDock('[role="status"]')).toBeNull();

    play('a');
    expect(screen.getByRole('status').textContent).toBe(translate(bookId, 'FEEDBACK.OFFLINE'));
  });
});
