import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkConnectivity } from '@/other/connectivity';
import { trackEvent } from '@/other/analytics';
import { playerManager } from '@/other/player/PlayerManager';
import {
  fakeUrl,
  getFakeAdapter,
  makeController,
  mountPlayer,
  mountPlayers,
  resetPlayers
} from '@/tests/helpers/player';

vi.mock('@/other/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/other/connectivity', () => ({ checkConnectivity: vi.fn() }));

const TRACK_INFO = { bookId: 'en', pageType: 'song', singer: 'Singer', title: 'Song' } as const;

/** A mounted player that was started and reports that it plays. */
function startPlaying(name: string, options?: Parameters<typeof makeController>[1]) {
  const controller = makeController(name, options);
  mountPlayer(controller);
  controller.play();
  const adapter = getFakeAdapter(name);
  adapter.events.onStatus('playing');

  return { adapter, controller };
}

beforeEach(() => {
  vi.mocked(trackEvent).mockClear();
  vi.mocked(checkConnectivity).mockClear();
});

afterEach(() => {
  resetPlayers();
  vi.restoreAllMocks();
});

describe('PlayerController', () => {
  it('starts idle and creates its source only on the first play', () => {
    const [controller] = mountPlayers(['a']);

    expect(controller.getSnapshot()).toEqual({ status: 'idle', position: 0, duration: null });
    expect(getFakeAdapter('a')).toBeUndefined();

    controller.play();

    expect(getFakeAdapter('a').play).toHaveBeenCalledOnce();
    expect(playerManager.getSnapshot().active).toBe(controller);
  });

  it('takes its plugin, action and key from the source', () => {
    const controller = makeController('a');

    expect(controller.plugin.type).toBe('fake');
    expect(controller.action).toMatchObject({ kind: 'link', href: fakeUrl('a') });
    expect(controller.key).toBe(fakeUrl('a'));
    expect(controller.autoAdvance).toBe(true);
  });

  it('follows the status and the progress that the source reports', () => {
    const { adapter, controller } = startPlaying('a');

    adapter.events.onProgress(5, 100);

    expect(controller.getSnapshot()).toEqual({ status: 'playing', position: 5, duration: 100 });
    expect(controller.isBusy()).toBe(true);
  });

  it('tells its subscribers about changes only', () => {
    const { adapter, controller } = startPlaying('a');
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    adapter.events.onProgress(5, 100);
    adapter.events.onProgress(5, 100);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    adapter.events.onProgress(6, 100);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('toggles between playing and paused', () => {
    const { adapter, controller } = startPlaying('a');

    controller.toggle();
    expect(adapter.pause).toHaveBeenCalledOnce();

    adapter.events.onStatus('paused');
    controller.toggle();
    expect(adapter.play).toHaveBeenCalledTimes(2);
  });

  it('counts loading as busy, so a second press pauses instead of starting again', () => {
    const [controller] = mountPlayers(['a']);
    controller.play();
    getFakeAdapter('a').events.onStatus('loading');

    controller.toggle();

    expect(getFakeAdapter('a').pause).toHaveBeenCalledOnce();
    expect(getFakeAdapter('a').play).toHaveBeenCalledOnce();
  });

  it('does not pause a source that is not playing', () => {
    const { adapter, controller } = startPlaying('a');
    adapter.events.onStatus('paused');

    controller.pause();

    expect(adapter.pause).not.toHaveBeenCalled();
  });

  describe('seeking', () => {
    it('seeks the source', () => {
      const { adapter, controller } = startPlaying('a');

      controller.seek(30);

      expect(adapter.seek).toHaveBeenCalledExactlyOnceWith(30);
    });

    it('leaves the ended state when the user seeks back', () => {
      const { adapter, controller } = startPlaying('a');
      adapter.events.onEnded();

      controller.seek(30);

      expect(controller.getSnapshot().status).toBe('paused');
    });

    it.each([
      ['forward', 50, 10, 60],
      ['back', 50, -10, 40],
      ['forward, but not past the end', 95, 10, 100],
      ['back, but not before the start', 5, -10, 0]
    ])('steps %s', (_name, position, delta, expected) => {
      const { adapter, controller } = startPlaying('a');
      adapter.events.onProgress(position, 100);

      controller.seekBy(delta);

      expect(adapter.seek).toHaveBeenCalledExactlyOnceWith(expected);
    });

    it('does not step while the duration is unknown', () => {
      const { adapter, controller } = startPlaying('a');

      controller.seekBy(10);

      expect(adapter.seek).not.toHaveBeenCalled();
    });
  });

  describe('starting again', () => {
    it('resumes the active track from where it was paused', () => {
      const { adapter, controller } = startPlaying('a');
      adapter.events.onProgress(20, 100);
      adapter.events.onStatus('paused');

      controller.play();

      expect(adapter.seek).not.toHaveBeenCalled();
      expect(adapter.play).toHaveBeenCalledTimes(2);
    });

    it('restarts a track that ended', () => {
      const { adapter, controller } = startPlaying('a');
      adapter.events.onEnded();
      expect(controller.getSnapshot().status).toBe('ended');

      controller.play();

      expect(adapter.seek).toHaveBeenCalledExactlyOnceWith(0);
    });

    it('pauses the playing track when another one starts, and restarts it when the user comes back', () => {
      const a = startPlaying('a');
      a.adapter.events.onProgress(20, 100);

      const b = startPlaying('b');
      expect(a.adapter.pause).toHaveBeenCalledOnce();
      expect(playerManager.getSnapshot().active).toBe(b.controller);

      a.adapter.events.onStatus('paused');
      a.controller.play();
      expect(a.adapter.seek).toHaveBeenCalledExactlyOnceWith(0);
    });
  });

  describe('at the end of a track', () => {
    it('plays the next player of the page', () => {
      const [a, b] = mountPlayers(['a', 'b']);
      a.play();

      getFakeAdapter('a').events.onEnded();

      expect(getFakeAdapter('b').play).toHaveBeenCalledOnce();
      expect(playerManager.getSnapshot().active).toBe(b);
    });

    it('stops when auto-advance is off', () => {
      const [a] = mountPlayers(['a', 'b'], { autoAdvance: false });
      a.play();

      getFakeAdapter('a').events.onEnded();

      expect(getFakeAdapter('b')).toBeUndefined();
      expect(a.getSnapshot().status).toBe('ended');
    });
  });

  it('shows an error, logs it and re-checks the connection when the source fails', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { adapter, controller } = startPlaying('a');

    adapter.events.onError(new Error('Source failed'));

    expect(controller.getSnapshot().status).toBe('error');
    expect(error).toHaveBeenCalledOnce();
    expect(checkConnectivity).toHaveBeenCalledOnce();
  });

  describe('analytics', () => {
    const expected = ['player_start', { songbook: 'en', page_type: 'song', singer: 'Singer', title: 'Song' }];

    it('reports the start of a track once, when it really plays', () => {
      const controller = makeController('a', { trackInfo: TRACK_INFO });
      mountPlayer(controller);
      controller.play();
      getFakeAdapter('a').events.onStatus('loading');
      expect(trackEvent).not.toHaveBeenCalled();

      getFakeAdapter('a').events.onStatus('playing');
      expect(trackEvent).toHaveBeenCalledExactlyOnceWith(...expected);
    });

    it('does not report buffering or a resume as a new start', () => {
      const { adapter, controller } = startPlaying('a', { trackInfo: TRACK_INFO });

      adapter.events.onStatus('loading');
      adapter.events.onStatus('playing');
      controller.pause();
      adapter.events.onStatus('paused');
      controller.play();
      adapter.events.onStatus('playing');

      expect(trackEvent).toHaveBeenCalledOnce();
    });

    it.each([
      ['the track ended and was played again', (adapter: ReturnType<typeof getFakeAdapter>) => adapter.events.onEnded()],
      ['another track played in between', () => startPlaying('b')]
    ])('reports a new start after %s', (_name, interrupt) => {
      const { adapter, controller } = startPlaying('a', { trackInfo: TRACK_INFO });

      interrupt(adapter);
      controller.play();
      adapter.events.onStatus('playing');

      expect(trackEvent).toHaveBeenCalledTimes(2);
    });

    it('reports nothing for a player without track info', () => {
      startPlaying('a');

      expect(trackEvent).not.toHaveBeenCalled();
    });
  });

  it('changes its titles silently', () => {
    const controller = makeController('a');
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.setTitle('New title', 'New subtitle');

    expect(controller).toMatchObject({ title: 'New title', subtitle: 'New subtitle' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('releases its source and goes back to idle when destroyed', () => {
    const { adapter, controller } = startPlaying('a');
    adapter.events.onProgress(20, 100);

    controller.destroy();

    expect(adapter.destroy).toHaveBeenCalledOnce();
    expect(controller.getSnapshot()).toEqual({ status: 'idle', position: 0, duration: null });
  });
});
