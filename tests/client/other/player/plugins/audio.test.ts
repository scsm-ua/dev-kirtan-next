import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { audioPlugin } from '@/other/player/plugins/audio';

const URL_A = 'https://example.com/a.mp3';
const URL_B = 'https://example.com/b.mp3';

type TMedia = { currentTime: number; duration: number; ended: boolean; paused: boolean; readyState: number };

let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;
let load: ReturnType<typeof vi.spyOn>;

/** All adapters share one `<audio>` element; it is known once something has played. */
const getElement = () => play.mock.contexts[0] as HTMLAudioElement;

/** Sets the read-only media state that a real browser would report. */
function setMedia(state: Partial<TMedia>) {
  for (const [key, value] of Object.entries(state)) {
    Object.defineProperty(getElement(), key, { configurable: true, value, writable: true });
  }
}

const fire = (type: string) => getElement().dispatchEvent(new Event(type));

/** Lets the promise of a rejected `play()` settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**/
function makeAdapter(url: string) {
  const events = { onStatus: vi.fn(), onProgress: vi.fn(), onEnded: vi.fn(), onError: vi.fn() };
  return { adapter: audioPlugin.createAdapter(url, events), events };
}

/** An adapter that owns the element, with the media state reset. */
function startPlaying(url = URL_A, state: Partial<TMedia> = {}) {
  const made = makeAdapter(url);
  made.adapter.play();
  setMedia({ currentTime: 0, duration: NaN, ended: false, paused: false, readyState: 0, ...state });
  made.events.onStatus.mockClear();

  return made;
}

beforeEach(() => {
  // jsdom does not play media.
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('audio adapter', () => {
  it('touches no media until the first play', () => {
    const { events } = makeAdapter(URL_A);

    expect(play).not.toHaveBeenCalled();
    expect(events.onStatus).not.toHaveBeenCalled();
  });

  it('loads its file into the shared element and reports loading', () => {
    const { adapter, events } = makeAdapter(URL_A);

    adapter.play();

    expect(getElement().src).toBe(URL_A);
    expect(play).toHaveBeenCalledOnce();
    expect(events.onStatus).toHaveBeenCalledExactlyOnceWith('loading');
  });

  it.each([
    ['playing', {}, 'playing'],
    ['waiting', { paused: false }, 'loading'],
    ['pause', { paused: true }, 'paused']
  ])('reports the "%s" event of the element', (type, state, status) => {
    const { events } = startPlaying();
    setMedia(state);

    fire(type);

    expect(events.onStatus).toHaveBeenCalledExactlyOnceWith(status);
  });

  it.each([
    ['a pause that is really the end of the track', 'pause', { paused: true, ended: true }],
    ['a late pause of the previous track', 'pause', { paused: false }],
    ['waiting while paused', 'waiting', { paused: true }]
  ])('ignores %s', (_name, type, state) => {
    const { events } = startPlaying();
    setMedia(state);

    fire(type);

    expect(events.onStatus).not.toHaveBeenCalled();
  });

  it('reports the position, and the duration once it is known', () => {
    const { events } = startPlaying();

    setMedia({ currentTime: 3 });
    fire('timeupdate');
    setMedia({ currentTime: 12, duration: 100 });
    fire('timeupdate');
    setMedia({ currentTime: 13, duration: NaN });
    fire('timeupdate');

    expect(events.onProgress.mock.calls).toEqual([
      [3, null],
      [12, 100],
      [13, 100]
    ]);
  });

  describe('seeking', () => {
    it('moves the element when the media is ready', () => {
      const { adapter, events } = startPlaying(URL_A, { readyState: HTMLMediaElement.HAVE_METADATA, duration: 100 });
      fire('durationchange');

      adapter.seek(30);

      expect(getElement().currentTime).toBe(30);
      expect(events.onProgress).toHaveBeenLastCalledWith(30, 100);
    });

    it('remembers a position asked for before playing and applies it once the media is ready', () => {
      const { adapter, events } = makeAdapter(URL_A);

      adapter.seek(30);
      expect(events.onProgress).toHaveBeenLastCalledWith(30, null);

      adapter.play();
      setMedia({ currentTime: 0, duration: 100, ended: false, paused: false, readyState: 0 });
      fire('timeupdate');
      expect(events.onProgress).toHaveBeenLastCalledWith(30, null);

      fire('loadedmetadata');
      expect(getElement().currentTime).toBe(30);
      expect(events.onProgress).toHaveBeenLastCalledWith(30, 100);
    });
  });

  it('pauses the element', () => {
    const { adapter, events } = startPlaying();

    adapter.pause();

    expect(pause).toHaveBeenCalledOnce();
    expect(events.onStatus).toHaveBeenCalledExactlyOnceWith('paused');
  });

  it('reports the end of the track at its full length', () => {
    const { events } = startPlaying(URL_A, { currentTime: 99, duration: 100 });
    fire('timeupdate');

    fire('ended');

    expect(events.onProgress).toHaveBeenLastCalledWith(100, 100);
    expect(events.onEnded).toHaveBeenCalledOnce();
  });

  it('reports a media error', () => {
    const { events } = startPlaying();

    fire('error');

    expect(events.onError).toHaveBeenCalledOnce();
  });

  describe('when the browser refuses to play', () => {
    const refuse = (name: string) => play.mockRejectedValueOnce(Object.assign(new Error(name), { name }));

    it('goes back to paused when playback needs a user gesture', async () => {
      const { adapter, events } = makeAdapter(URL_A);
      refuse('NotAllowedError');

      adapter.play();
      await flush();

      expect(events.onStatus).toHaveBeenLastCalledWith('paused');
      expect(events.onError).not.toHaveBeenCalled();
    });

    it('ignores a play that another play interrupted', async () => {
      const { adapter, events } = makeAdapter(URL_A);
      refuse('AbortError');

      adapter.play();
      await flush();

      expect(events.onStatus).toHaveBeenCalledExactlyOnceWith('loading');
      expect(events.onError).not.toHaveBeenCalled();
    });

    it('reports any other failure as an error', async () => {
      const { adapter, events } = makeAdapter(URL_A);
      refuse('NotSupportedError');

      adapter.play();
      await flush();

      expect(events.onError).toHaveBeenCalledOnce();
    });
  });

  describe('with two players', () => {
    it('gives the element to the player that plays; only that one hears its events', () => {
      const a = startPlaying(URL_A);
      const b = startPlaying(URL_B);

      fire('playing');

      expect(getElement().src).toBe(URL_B);
      expect(b.events.onStatus).toHaveBeenCalledExactlyOnceWith('playing');
      expect(a.events.onStatus).not.toHaveBeenCalled();
    });

    it('does not pause the element for a player that does not own it', () => {
      const a = startPlaying(URL_A);
      startPlaying(URL_B);

      a.adapter.pause();

      expect(pause).not.toHaveBeenCalled();
      expect(a.events.onStatus).toHaveBeenCalledExactlyOnceWith('paused');
    });

    it('returns to the position of the first player when it plays again', () => {
      const a = startPlaying(URL_A, { currentTime: 40, duration: 100 });
      fire('timeupdate');
      startPlaying(URL_B);

      a.adapter.play();
      setMedia({ currentTime: 0, duration: 100 });
      fire('loadedmetadata');

      expect(getElement().src).toBe(URL_A);
      expect(getElement().currentTime).toBe(40);
    });
  });

  describe('destroy', () => {
    it('stops the element and drops the file', () => {
      const { adapter, events } = startPlaying();

      adapter.destroy();
      fire('playing');

      expect(pause).toHaveBeenCalledOnce();
      expect(load).toHaveBeenCalledOnce();
      expect(getElement().hasAttribute('src')).toBe(false);
      expect(events.onStatus).not.toHaveBeenCalled();
    });

    it('leaves the element alone when another player owns it', () => {
      const a = startPlaying(URL_A);
      startPlaying(URL_B);

      a.adapter.destroy();

      expect(pause).not.toHaveBeenCalled();
      expect(getElement().src).toBe(URL_B);
    });
  });
});

describe('audio plugin', () => {
  it.each([
    ['https://example.com/a.mp3', true],
    ['https://example.com/a.M4A', true],
    ['https://example.com/a.ogg?v=1', true],
    ['https://example.com/a.wav#t=10', true],
    ['https://example.com/a.mp3.html', false],
    ['https://soundcloud.com/some-user/some-track', false]
  ])('match(%s) is %s', (url, expected) => {
    expect(audioPlugin.match(url)).toBe(expected);
  });

  it('offers the file as a download', () => {
    expect(audioPlugin.getAction(URL_A)).toEqual({ kind: 'download', href: URL_A, label: 'Download' });
  });
});
