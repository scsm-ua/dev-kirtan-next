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

  it('follows a reorder of the page after refresh()', () => {
    const [a] = mountPlayers(['a', 'b']);
    a.play();

    document.body.appendChild(a.element);
    playerManager.refresh();

    expect(playerManager.getSnapshot()).toMatchObject({ hasPrev: true, hasNext: false });
  });

  it('notices players that appear or go while one is active', async () => {
    const [a] = mountPlayers(['a']);
    a.play();
    expect(playerManager.getSnapshot().hasNext).toBe(false);

    mountPlayers(['b']);
    await flush();

    expect(playerManager.getSnapshot().hasNext).toBe(true);
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

    it('continues the track in the widget of the same track on the new page', () => {
      const [a, b] = mountPlayers(['a', 'b']);
      a.play();
      b.play();
      a.play();
      getFakeAdapter('a').events.onStatus('playing');
      const adapterA = getFakeAdapter('a');
      leavePage();

      const sameTrack = makeController('a');
      mountPlayer(sameTrack);

      expect(playerManager.getSnapshot().active).toBe(sameTrack);
      expect(sameTrack.getSnapshot().status).toBe('playing');
      expect(adapterA.destroy).not.toHaveBeenCalled();
      expect(getFakeAdapter('b').destroy).toHaveBeenCalledOnce();
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
