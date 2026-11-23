import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerManager, RESTART_THRESHOLD } from '@/other/player/PlayerManager';
import {
  getFakeAdapter,
  leavePage,
  makeController,
  mountPlayer,
  mountPlayers,
  resetPlayers
} from '@/tests/helpers/player';

/** Lets the batched update of the manager run. */
const flush = () => Promise.resolve();

afterEach(() => {
  resetPlayers();
  delete (navigator as { mediaSession?: unknown }).mediaSession;
  vi.unstubAllGlobals();
});

describe('PlayerManager', () => {
  it('has no active player at first', () => {
    mountPlayers(['a', 'b']);

    expect(playerManager.getSnapshot()).toEqual({ active: null, hasPrev: false, hasNext: false });
  });

  it.each([
    ['the first', 0, false, true],
    ['a middle', 1, true, true],
    ['the last', 2, true, false]
  ])('knows whether %s player of the page has neighbours', (_name, index, hasPrev, hasNext) => {
    const players = mountPlayers(['a', 'b', 'c']);

    players[index].play();

    expect(playerManager.getSnapshot()).toEqual({ active: players[index], hasPrev, hasNext });
  });

  it('orders the players as they stand on the page, not as they were created', () => {
    const b = makeController('b');
    const a = makeController('a');
    const elementB = mountPlayer(b);
    const elementA = mountPlayer(a);
    document.body.insertBefore(elementA, elementB);

    a.play();

    expect(playerManager.getSnapshot()).toMatchObject({ hasPrev: false, hasNext: true });
  });

  it('follows a reorder of its page after refresh()', () => {
    const [a] = mountPlayers(['a', 'b']);
    a.play();

    document.body.appendChild(a.element);
    playerManager.refresh();

    expect(playerManager.getSnapshot()).toMatchObject({ hasPrev: true, hasNext: false });
  });

  it('keeps its order through pause and resume, and through its own moves', () => {
    const [a, b] = mountPlayers(['a', 'b']);
    a.play();
    // Reordered, but nobody said so: the queue is as it was started.
    document.body.appendChild(a.element);

    a.pause();
    a.play();
    playerManager.playNext();
    expect(playerManager.getSnapshot()).toMatchObject({ active: b, hasPrev: true, hasNext: false });
    playerManager.playPrev();
    expect(playerManager.getSnapshot()).toMatchObject({ active: a, hasPrev: false, hasNext: true });
  });

  it('is not changed by refresh() on another page', () => {
    const [a, b] = mountPlayers(['a', 'b'], { originPath: '/first/' });
    a.play();
    leavePage();
    // The other page has both tracks, the other way round.
    mountPlayers(['b', 'a'], { originPath: '/second/' });

    playerManager.refresh();

    expect(playerManager.getSnapshot()).toMatchObject({ active: a, hasPrev: false, hasNext: true });
    playerManager.playNext();
    expect(playerManager.getSnapshot().active).toBe(b);
  });

  it('takes the order of the page again when the user starts another track', async () => {
    const [a, b] = mountPlayers(['a', 'b']);
    a.play();
    document.body.appendChild(a.element);
    const [c] = mountPlayers(['c']);
    await flush();
    expect(playerManager.getSnapshot().hasNext).toBe(true);

    b.play();

    // Now b, a, c.
    expect(playerManager.getSnapshot()).toMatchObject({ active: b, hasPrev: false, hasNext: true });
    playerManager.playNext();
    playerManager.playNext();
    expect(playerManager.getSnapshot()).toMatchObject({ active: c, hasPrev: true, hasNext: false });
  });

  it('keeps the queue when a track ends and the next one starts by itself', () => {
    const [a, b] = mountPlayers(['a', 'b', 'c']);
    a.play();
    document.body.appendChild(b.element);

    getFakeAdapter('a').events.onEnded();

    expect(playerManager.getSnapshot()).toMatchObject({ active: b, hasPrev: true, hasNext: true });
  });

  describe('a looped queue', () => {
    it('goes on with the first player after the last one, by "next" and when the track ends', () => {
      const [a, , c] = mountPlayers(['a', 'b', 'c'], { loop: true });
      c.play();
      expect(playerManager.getSnapshot()).toMatchObject({ active: c, hasPrev: true, hasNext: true });

      playerManager.playNext();
      expect(playerManager.getSnapshot()).toMatchObject({ active: a, hasPrev: true, hasNext: true });

      c.play();
      getFakeAdapter('c').events.onEnded();
      expect(playerManager.getSnapshot().active).toBe(a);
    });

    it('goes from the first player back to the last one on "previous"', () => {
      const [a, , c] = mountPlayers(['a', 'b', 'c'], { loop: true });
      a.play();
      expect(playerManager.getSnapshot()).toMatchObject({ active: a, hasPrev: true, hasNext: true });

      playerManager.playPrev();

      expect(playerManager.getSnapshot().active).toBe(c);
    });

    it('restarts the first track on "previous" once it has played for a while', () => {
      const [a] = mountPlayers(['a', 'b'], { loop: true });
      a.play();
      getFakeAdapter('a').events.onProgress(RESTART_THRESHOLD + 1, 100);

      playerManager.playPrev();

      expect(playerManager.getSnapshot().active).toBe(a);
      expect(getFakeAdapter('a').seek).toHaveBeenLastCalledWith(0);
      expect(getFakeAdapter('b')).toBeUndefined();
    });

    it('plays its only track again when it ends, and offers no "next" or "previous"', () => {
      const [a] = mountPlayers(['a'], { loop: true });
      a.play();
      expect(playerManager.getSnapshot()).toMatchObject({ hasPrev: false, hasNext: false });

      getFakeAdapter('a').events.onEnded();

      expect(playerManager.getSnapshot().active).toBe(a);
      expect(getFakeAdapter('a').seek).toHaveBeenLastCalledWith(0);
      expect(getFakeAdapter('a').play).toHaveBeenCalledTimes(2);
    });

    it('stops at the end when the last track does not advance or the queue is not looped', () => {
      const [, b] = mountPlayers(['a', 'b']);
      b.play();
      expect(playerManager.getSnapshot().hasNext).toBe(false);
      getFakeAdapter('b').events.onEnded();
      expect(playerManager.getSnapshot().active).toBe(b);
      expect(getFakeAdapter('a')).toBeUndefined();
    });
  });

  it('tells its subscribers when the active player changes', () => {
    const [a] = mountPlayers(['a']);
    const listener = vi.fn();
    const unsubscribe = playerManager.subscribe(listener);

    a.play();
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    playerManager.clearActive();
    expect(listener).toHaveBeenCalledOnce();
  });

  describe('controls', () => {
    it('plays the first player of the page', () => {
      const b = makeController('b');
      const a = makeController('a');
      const elementB = mountPlayer(b);
      document.body.insertBefore(mountPlayer(a), elementB);

      playerManager.playFirst();

      expect(playerManager.getSnapshot().active).toBe(a);
    });

    it('plays the next player', () => {
      const [a, b] = mountPlayers(['a', 'b']);
      a.play();

      playerManager.playNext();

      expect(playerManager.getSnapshot().active).toBe(b);
      expect(getFakeAdapter('a').pause).not.toHaveBeenCalled();
    });

    it('does nothing for "next" on the last player', () => {
      const [, b] = mountPlayers(['a', 'b']);
      b.play();

      playerManager.playNext();

      expect(playerManager.getSnapshot().active).toBe(b);
    });

    it('plays the previous player when the track has just started', () => {
      const [a, b] = mountPlayers(['a', 'b']);
      b.play();
      getFakeAdapter('b').events.onProgress(RESTART_THRESHOLD, 100);

      playerManager.playPrev();

      expect(playerManager.getSnapshot().active).toBe(a);
    });

    it('restarts the track on "previous" when it has played for a while', () => {
      const [, b] = mountPlayers(['a', 'b']);
      b.play();
      getFakeAdapter('b').events.onProgress(RESTART_THRESHOLD + 1, 100);

      playerManager.playPrev();

      expect(playerManager.getSnapshot().active).toBe(b);
      expect(getFakeAdapter('b').seek).toHaveBeenCalledExactlyOnceWith(0);
    });

    it('restarts the track on "previous" when there is no previous player', () => {
      const [a] = mountPlayers(['a', 'b']);
      a.play();

      playerManager.playPrev();

      expect(getFakeAdapter('a').seek).toHaveBeenCalledExactlyOnceWith(0);
    });

    it('pauses the track and forgets it when the dock is closed', () => {
      const [a] = mountPlayers(['a']);
      a.play();
      getFakeAdapter('a').events.onStatus('playing');

      playerManager.clearActive();

      expect(getFakeAdapter('a').pause).toHaveBeenCalledOnce();
      expect(playerManager.getSnapshot().active).toBeNull();
    });
  });

  describe('after the page of the active player is left', () => {
    it('keeps the players of that page alive, so playback and "next" go on', () => {
      const [a, b] = mountPlayers(['a', 'b']);
      a.play();

      leavePage();

      expect(playerManager.getSnapshot()).toEqual({ active: a, hasPrev: false, hasNext: true });
      expect(getFakeAdapter('a').destroy).not.toHaveBeenCalled();

      playerManager.playNext();
      expect(playerManager.getSnapshot().active).toBe(b);
      expect(getFakeAdapter('b').play).toHaveBeenCalledOnce();
    });

    it('gives the kept player back to its widget when the page is shown again', () => {
      const [a] = mountPlayers(['a']);
      a.play();
      leavePage();
      const create = vi.fn(() => makeController('a'));

      expect(playerManager.acquire(a.key, create)).toBe(a);
      expect(create).not.toHaveBeenCalled();
    });

    it('creates a new player for a widget that has none kept', () => {
      const [a] = mountPlayers(['a']);
      a.play();
      const fresh = makeController('other');

      expect(playerManager.acquire(a.key, () => fresh)).toBe(fresh);
      expect(playerManager.acquire('unknown-key', () => fresh)).toBe(fresh);
    });

    it('keeps the queue when the new page has the same track: its widget only mirrors it', () => {
      const [a, b, c] = mountPlayers(['a', 'b', 'c'], { originPath: '/first/' });
      b.play();
      leavePage();

      const sameTrack = makeController('b', { originPath: '/second/' });
      const other = makeController('other', { originPath: '/second/' });
      mountPlayer(other);
      mountPlayer(sameTrack);

      expect(playerManager.getSnapshot()).toMatchObject({ active: b, hasPrev: true, hasNext: true });
      expect(playerManager.getShown(sameTrack)).toBe(b);
      expect(playerManager.getShown(other)).toBe(other);
      expect(b.originPath).toBe('/first/');
      expect(getFakeAdapter('b').destroy).not.toHaveBeenCalled();

      // "Next" follows the first page, and the mirror lets go of the track that ended.
      playerManager.playNext();
      expect(playerManager.getSnapshot().active).toBe(c);
      expect(playerManager.getShown(sameTrack)).toBe(sameTrack);
      expect(a.getSnapshot().status).toBe('idle');
    });

    it('does not mirror the same track twice on one page', () => {
      const [a] = mountPlayers(['a'], { originPath: '/first/' });
      const twin = makeController('a', { originPath: '/first/' });
      mountPlayer(twin);
      a.play();

      expect(playerManager.getShown(twin)).toBe(twin);
    });

    it('knows whether the shown page has the active player: its own, mirrored, or not at all', () => {
      expect(playerManager.getActiveOnPage()).toBeNull();
      const [a] = mountPlayers(['a'], { originPath: '/first/' });
      a.play();
      expect(playerManager.getActiveOnPage()).toBe(a);

      leavePage();
      mountPlayer(makeController('other', { originPath: '/second/' }));
      expect(playerManager.getActiveOnPage()).toBeNull();

      mountPlayer(makeController('a', { originPath: '/second/' }));
      expect(playerManager.getActiveOnPage()).toBe(a);
    });

    it('starts a new queue when the same track is played on another page after the dock was closed', () => {
      const [a] = mountPlayers(['a', 'b'], { originPath: '/first/' });
      a.play();
      leavePage();
      playerManager.clearActive();

      const [, sameTrack] = mountPlayers(['x', 'a'], { originPath: '/second/' });
      expect(playerManager.getShown(sameTrack)).toBe(sameTrack);
      sameTrack.play();

      expect(playerManager.getSnapshot()).toMatchObject({ active: sameTrack, hasPrev: true, hasNext: false });
    });

    it('keeps the view of its page, and follows it only there', () => {
      const view = { sort: 'title' };
      const [a, b] = mountPlayers(['a', 'b'], { originPath: '/first/' });
      playerManager.setPageView('/first/', view);
      expect(playerManager.getPlaylistView('/first/')).toBeNull();

      a.play();
      expect(playerManager.getPlaylistView('/first/')).toBe(view);

      // Another sort on its page is taken; one on another page is not.
      const shuffle = { sort: 'shuffle' };
      playerManager.setPageView('/first/', shuffle);
      playerManager.refresh();
      expect(playerManager.getPlaylistView('/first/')).toBe(shuffle);
      playerManager.playNext();
      leavePage();
      playerManager.setPageView('/second/', { sort: 'firstLine' });
      playerManager.refresh();
      expect(playerManager.getSnapshot().active).toBe(b);
      expect(playerManager.getPlaylistView('/first/')).toBe(shuffle);
      expect(playerManager.getPlaylistView('/second/')).toBeNull();

      // Another queue starts: the view of that page is taken.
      const [other] = mountPlayers(['other'], { originPath: '/second/' });
      other.play();
      expect(playerManager.getPlaylistView('/first/')).toBeNull();
      expect(playerManager.getPlaylistView('/second/')).toEqual({ sort: 'firstLine' });
    });

    it('forgets the view when the dock is closed, and has none for a page that reported none', () => {
      const [a] = mountPlayers(['a'], { originPath: '/first/' });
      playerManager.setPageView('/first/', { sort: 'title' });
      a.play();
      playerManager.clearActive();
      expect(playerManager.getPlaylistView('/first/')).toBeNull();

      leavePage();
      const [song] = mountPlayers(['song'], { originPath: '/song/' });
      song.play();
      expect(playerManager.getPlaylistView('/song/')).toBeNull();
    });

    it.each([
      ['a player of the new page starts', () => mountPlayers(['other'])[0].play()],
      ['the dock is closed', () => playerManager.clearActive()]
    ])('releases the kept players when %s', (_name, act) => {
      const [a, b] = mountPlayers(['a', 'b']);
      b.play();
      a.play();
      leavePage();

      act();

      expect(getFakeAdapter('a').destroy).toHaveBeenCalledOnce();
      expect(getFakeAdapter('b').destroy).toHaveBeenCalledOnce();
      expect(playerManager.getSnapshot().hasPrev).toBe(false);
    });
  });

  describe('OS media controls', () => {
    type TMediaSession = {
      metadata: { title: string; artist: string } | null;
      playbackState: string;
      setActionHandler: ReturnType<typeof vi.fn>;
      setPositionState: ReturnType<typeof vi.fn>;
    };

    /** jsdom has no Media Session: give `navigator` one that records what it is told. */
    function stubMediaSession(): TMediaSession {
      const mediaSession: TMediaSession = {
        metadata: null,
        playbackState: 'none',
        setActionHandler: vi.fn(),
        setPositionState: vi.fn()
      };
      Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: mediaSession });
      vi.stubGlobal(
        'MediaMetadata',
        class {
          constructor(init: object) {
            Object.assign(this, init);
          }
        }
      );

      return mediaSession;
    }

    const getHandlers = (mediaSession: TMediaSession) =>
      Object.fromEntries(mediaSession.setActionHandler.mock.calls.map(([action, handler]) => [action, !!handler]));

    it('shows the title of the active track and follows its state', () => {
      const mediaSession = stubMediaSession();
      const [a] = mountPlayers(['a', 'b']);

      a.play();
      getFakeAdapter('a').events.onStatus('playing');
      getFakeAdapter('a').events.onProgress(20, 100);

      expect(mediaSession.metadata).toMatchObject({ title: 'Title a', artist: 'Subtitle' });
      expect(mediaSession.playbackState).toBe('playing');
      expect(mediaSession.setPositionState).toHaveBeenLastCalledWith({ duration: 100, position: 20, playbackRate: 1 });

      getFakeAdapter('a').events.onStatus('paused');
      expect(mediaSession.playbackState).toBe('paused');
    });

    it('offers "next" only when there is a next player', () => {
      const mediaSession = stubMediaSession();
      const [a, b] = mountPlayers(['a', 'b']);

      a.play();
      expect(getHandlers(mediaSession)).toEqual({ play: true, pause: true, previoustrack: true, nexttrack: true });

      b.play();
      expect(getHandlers(mediaSession)).toEqual({ play: true, pause: true, previoustrack: true, nexttrack: false });
    });

    it('clears everything when the dock is closed', () => {
      const mediaSession = stubMediaSession();
      const [a] = mountPlayers(['a']);
      a.play();

      playerManager.clearActive();

      expect(mediaSession.metadata).toBeNull();
      expect(mediaSession.playbackState).toBe('none');
      expect(getHandlers(mediaSession)).toEqual({
        play: false,
        pause: false,
        previoustrack: false,
        nexttrack: false
      });
    });
  });
});
