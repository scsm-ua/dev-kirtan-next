import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import Playlist from '@/components/audio/Playlist';
import { translate } from '@/other/i18n';
import { getSongPathWithPage } from '@/other/paths';
import { playerManager } from '@/other/player/PlayerManager';
import { PagePathContext } from '@/other/router/pagePath';
import { getBookIds } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';
import { fakeAllSources } from '@/tests/helpers/player';
import { closePlayerPage } from '@/tests/helpers/playerPage';

import type { TAudioTrack } from '@/types/audio';

// As in `next build`: lib/ caches the contents of the books.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

let bookId: string;
let tracks: TAudioTrack[];

const byTitle = (list: TAudioTrack[]) => [...list].sort((a, b) => a.order - b.order);
const sameOrder = (a: TAudioTrack[], b: TAudioTrack[]) => a.every((track, i) => track === b[i]);

beforeAll(async () => {
  for (const id of getBookIds()) {
    const page = await loadPage({ kind: 'audio', bookId: id }, 'audio');
    const list = page.data.tracks;
    // The title sort must change the order, and some song must have a title other than its first line.
    if (!sameOrder(list, byTitle(list)) && list.some((track) => track.label !== track.item.title)) {
      bookId = id;
      tracks = list;
      break;
    }
  }
  // Guard: a real book covers every case below.
  expect(tracks).toBeTruthy();
});

let playFirst: ReturnType<typeof vi.spyOn>;
let refresh: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // The real sources are SoundCloud: nothing may start playing in a test.
  playFirst = vi.spyOn(playerManager, 'playFirst').mockImplementation(() => {});
  refresh = vi.spyOn(playerManager, 'refresh');
});

afterEach(async () => {
  await closePlayerPage();
  vi.restoreAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

const label = (key: string) => translate(bookId, `AUDIO_PAGE.${key}`);
const items = () => [...document.querySelectorAll('.Playlist__item')];
const titles = () => items().map((li) => li.querySelector('.PlayerWidget__title').textContent);
const subtitles = () => items().map((li) => li.querySelector('.PlayerWidget__subtitle')?.textContent);
const radio = (key: string) => screen.getByRole<HTMLInputElement>('radio', { name: label(key) });

describe('Playlist', () => {
  it('lists the tracks by first line, each with a player and a link to its song', () => {
    render(<Playlist bookId={bookId} tracks={tracks} />);

    expect(titles()).toEqual(tracks.map((track) => track.label));
    expect(items().map((li) => li.querySelector('a.Playlist__link').getAttribute('href'))).toEqual(
      tracks.map((track) => getSongPathWithPage(bookId, track.item))
    );
    expect(items().map((li) => li.querySelector('.Playlist__page')?.textContent)).toEqual(
      tracks.map(({ item: { page } }) => (page ? String(Array.isArray(page) ? page.join(', ') : page) : undefined))
    );
    expect(items().every((li) => li.querySelector('.PlayerWidget button[aria-label="Play"]'))).toBe(true);
    expect(radio('SHOW_FIRST_LINES').checked).toBe(true);
  });

  it('shows the song title under a first line that differs from it', () => {
    render(<Playlist bookId={bookId} tracks={tracks} />);

    expect(subtitles()).toEqual(
      tracks.map((track) => (track.item.title !== track.label ? track.item.title : undefined))
    );
  });

  it('shows the singer under every track on the all-recordings page', () => {
    render(<Playlist bookId={bookId} showSinger tracks={tracks} />);

    expect(subtitles()).toEqual(tracks.map((track) => track.singerName));
  });

  it('by title: song titles in contents order, the first line underneath; kept for the session', async () => {
    render(<Playlist bookId={bookId} tracks={tracks} />);
    refresh.mockClear();
    await userEvent.click(radio('SHOW_TITLES'));
    const sorted = byTitle(tracks);

    expect(titles()).toEqual(sorted.map((track) => track.item.title));
    expect(subtitles()).toEqual(sorted.map((track) => (track.item.title !== track.label ? track.label : undefined)));
    expect(radio('SHOW_TITLES').checked).toBe(true);
    expect(sessionStorage.getItem('AUDIO_SORT')).toBe('title');
    // The dock's title, and prev/next on the page of the playing playlist, follow the new order.
    expect(refresh).toHaveBeenCalled();
  });

  it('opens with the order chosen earlier in the session', () => {
    sessionStorage.setItem('AUDIO_SORT', 'title');
    render(<Playlist bookId={bookId} tracks={tracks} />);

    expect(titles()).toEqual(byTitle(tracks).map((track) => track.item.title));
    expect(radio('SHOW_TITLES').checked).toBe(true);
  });

  it('shuffles all the tracks, and keeps the same shuffle when switched back to it', async () => {
    // Every swap takes the first slot it can: a fixed order, unlike the input.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<Playlist bookId={bookId} tracks={tracks} />);
    await userEvent.click(radio('SHOW_SHUFFLE'));
    const shuffled = titles();

    expect(shuffled).not.toEqual(tracks.map((track) => track.label));
    expect([...shuffled].sort()).toEqual(tracks.map((track) => track.label).sort());
    expect(sessionStorage.getItem('AUDIO_SORT')).toBe('shuffle');

    vi.mocked(Math.random).mockReturnValue(0.99);
    await userEvent.click(radio('SHOW_FIRST_LINES'));
    expect(titles()).toEqual(tracks.map((track) => track.label));
    await userEvent.click(radio('SHOW_SHUFFLE'));
    expect(titles()).toEqual(shuffled);
  });

  it('with ?autoplay=1 starts the first track once and drops only that parameter', () => {
    window.history.replaceState({ keep: 1 }, '', `/${bookId}/audio/?x=1&autoplay=1#list`);
    const { rerender } = render(<Playlist bookId={bookId} tracks={tracks} />);
    rerender(<Playlist bookId={bookId} tracks={tracks} />);

    expect(playFirst).toHaveBeenCalledTimes(1);
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(
      `/${bookId}/audio/?x=1#list`
    );
    expect(window.history.state).toEqual({ keep: 1 });
  });

  it('starts nothing without ?autoplay', () => {
    render(<Playlist bookId={bookId} tracks={tracks} />);

    expect(playFirst).not.toHaveBeenCalled();
  });

  describe('the page of the playing playlist', () => {
    const PAGE_PATH = '/book/audio/singer/';

    // The real sources are SoundCloud: play them on the fake source.
    beforeAll(fakeAllSources);

    const page = (path = PAGE_PATH) => (
      <PagePathContext.Provider value={path}>
        <Playlist bookId={bookId} tracks={tracks} />
      </PagePathContext.Provider>
    );

    /** Starts the second track, then leaves the page as a client navigation does. */
    async function playAndLeave(unmount: () => void) {
      fireEvent.click(items()[1].querySelector('.PlayerWidget button'));
      unmount();
      // Widgets unregister in a microtask after unmount.
      await act(() => Promise.resolve());
    }

    it('comes back in the order it was played in, whatever was chosen on other pages', async () => {
      const { unmount } = render(page());
      await userEvent.click(radio('SHOW_TITLES'));
      await playAndLeave(unmount);
      sessionStorage.setItem('AUDIO_SORT', 'firstLine');

      render(page());

      expect(titles()).toEqual(byTitle(tracks).map((track) => track.item.title));
      expect(radio('SHOW_TITLES').checked).toBe(true);
      expect(document.querySelector('.PlaylistSort--animated')).toBeNull();
      expect(items()[1].querySelector('.PlayerWidget--active')).toBeTruthy();
      // Only a click on the control changes the choice of the session.
      expect(sessionStorage.getItem('AUDIO_SORT')).toBe('firstLine');
    });

    it('is a loop: after the last track "next" plays the first one', () => {
      render(page());
      fireEvent.click(items().at(-1).querySelector('.PlayerWidget button'));
      expect(playerManager.getSnapshot().hasNext).toBe(true);

      act(() => playerManager.playNext());

      expect(items()[0].querySelector('.PlayerWidget--active')).toBeTruthy();
    });

    it('comes back with the same shuffle', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const { unmount } = render(page());
      await userEvent.click(radio('SHOW_SHUFFLE'));
      const shuffled = titles();
      await playAndLeave(unmount);
      vi.mocked(Math.random).mockReturnValue(0.99);

      render(page());

      expect(titles()).toEqual(shuffled);
      expect(radio('SHOW_SHUFFLE').checked).toBe(true);
    });

    it('a sort chosen there while it plays changes the playlist, and it comes back that way', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const { unmount } = render(page());
      await userEvent.click(radio('SHOW_TITLES'));
      fireEvent.click(items()[1].querySelector('.PlayerWidget button'));
      await userEvent.click(radio('SHOW_SHUFFLE'));
      const shuffled = titles();
      // "Next" is the next row of the shuffled list.
      const playing = items().findIndex((li) => li.querySelector('.PlayerWidget--active'));
      act(() => playerManager.playNext());
      expect(items()[playing + 1].querySelector('.PlayerWidget--active')).toBeTruthy();
      unmount();
      await act(() => Promise.resolve());
      vi.mocked(Math.random).mockReturnValue(0.99);
      sessionStorage.setItem('AUDIO_SORT', 'firstLine');

      render(page());

      expect(titles()).toEqual(shuffled);
      expect(radio('SHOW_SHUFFLE').checked).toBe(true);
    });

    it('does not change the order of other pages, nor of its own once the dock is closed', async () => {
      const { unmount } = render(page());
      await userEvent.click(radio('SHOW_TITLES'));
      await playAndLeave(unmount);
      sessionStorage.setItem('AUDIO_SORT', 'firstLine');

      const other = render(page('/book/audio/other/'));
      expect(titles()).toEqual(tracks.map((track) => track.label));
      other.unmount();

      act(() => playerManager.clearActive());
      render(page());
      expect(titles()).toEqual(tracks.map((track) => track.label));
    });
  });
});
