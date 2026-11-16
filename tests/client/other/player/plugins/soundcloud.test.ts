import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getIFrameUrl } from '@/other/helpers';

const URL_A = 'https://soundcloud.com/some-user/track-a';
const URL_B = 'https://soundcloud.com/some-user/track-b';
const API_URL = 'https://w.soundcloud.com/player/api.js';
const DURATION_MS = 180_000;

const EVENTS = {
  READY: 'ready',
  PLAY: 'play',
  PAUSE: 'pause',
  FINISH: 'finish',
  PLAY_PROGRESS: 'playProgress',
  ERROR: 'error'
};

/** Stand-in for the SoundCloud widget: records calls, and `emit` plays the part of the real one. */
type TFakeWidget = {
  iframe: HTMLIFrameElement;
  load: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
  emit: (event: string, payload?: object) => void;
};

type TWindow = { SC?: unknown };

let widgets: TFakeWidget[];
let mediaPlay: ReturnType<typeof vi.spyOn>;
let mediaPause: ReturnType<typeof vi.spyOn>;

/** Puts the SoundCloud widget API on the page, as its script does. */
function installApi() {
  const Widget = (iframe: HTMLIFrameElement) => {
    const handlers: Record<string, (payload?: object) => void> = {};
    const widget = {
      iframe,
      bind: (event: string, handler: (payload?: object) => void) => (handlers[event] = handler),
      getDuration: (callback: (ms: number) => void) => callback(DURATION_MS),
      load: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      seekTo: vi.fn(),
      emit: (event: string, payload?: object) => handlers[event]?.(payload)
    };
    widgets.push(widget);
    return widget;
  };
  (window as TWindow).SC = { Widget: Object.assign(Widget, { Events: EVENTS }) };
}

/** The plugin keeps the shared widget in the module, so every test loads a fresh copy. */
async function loadPlugin() {
  vi.resetModules();
  return (await import('@/other/player/plugins/soundcloud')).soundCloudPlugin;
}

/** Lets the promise chain that creates or reuses the widget run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**/
async function makeAdapter(url: string, plugin?: Awaited<ReturnType<typeof loadPlugin>>) {
  const events = { onStatus: vi.fn(), onProgress: vi.fn(), onEnded: vi.fn(), onError: vi.fn() };
  const used = plugin ?? (await loadPlugin());
  return { adapter: used.createAdapter(url, events), events, plugin: used };
}

/** An adapter whose track is loaded in the widget and plays. */
async function startPlaying(url = URL_A) {
  const made = await makeAdapter(url);
  made.adapter.play();
  await flush();
  const [widget] = widgets;
  widget.emit(EVENTS.READY);
  await flush();
  widget.emit(EVENTS.PLAY);
  made.events.onStatus.mockClear();
  made.events.onProgress.mockClear();

  return { ...made, widget };
}

beforeEach(() => {
  widgets = [];
  installApi();
  // jsdom does not play media and cannot make object URLs for it.
  mediaPlay = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  mediaPause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:silence');
});

afterEach(() => {
  delete (window as TWindow).SC;
  document.body.innerHTML = '';
  document.head.querySelectorAll('script').forEach((script) => script.remove());
  vi.restoreAllMocks();
});

describe('SoundCloud adapter', () => {
  it('touches nothing until the first play', async () => {
    await makeAdapter(URL_A);
    await flush();

    expect(document.querySelector('iframe')).toBeNull();
    expect(widgets).toHaveLength(0);
  });

  it('creates one hidden widget frame for the track and reports loading', async () => {
    const { adapter, events } = await makeAdapter(URL_A);

    adapter.play();
    await flush();
    const iframe = document.querySelector('iframe');

    expect(events.onStatus).toHaveBeenCalledExactlyOnceWith('loading');
    expect(iframe.src).toBe(`${getIFrameUrl(URL_A)}&auto_play=false`);
    expect(iframe.getAttribute('aria-hidden')).toBe('true');
    expect(iframe.tabIndex).toBe(-1);
    expect(widgets).toHaveLength(1);
    expect(widgets[0].play).not.toHaveBeenCalled();
  });

  it('starts the track when the widget is ready, and reports its duration', async () => {
    const { adapter, events } = await makeAdapter(URL_A);
    adapter.play();
    await flush();

    widgets[0].emit(EVENTS.READY);
    await flush();

    expect(widgets[0].play).toHaveBeenCalledOnce();
    expect(events.onProgress).toHaveBeenLastCalledWith(0, DURATION_MS / 1000);
  });

  it('does not start a track that was paused while it was loading', async () => {
    const { adapter } = await makeAdapter(URL_A);
    adapter.play();
    await flush();

    adapter.pause();
    widgets[0].emit(EVENTS.READY);
    await flush();

    expect(widgets[0].play).not.toHaveBeenCalled();
  });

  it.each([
    [EVENTS.PLAY, 'playing'],
    [EVENTS.PAUSE, 'paused']
  ])('reports the "%s" event of the widget', async (event, status) => {
    const { events, widget } = await startPlaying();

    widget.emit(event);

    expect(events.onStatus).toHaveBeenCalledExactlyOnceWith(status);
  });

  it('reports the position in seconds', async () => {
    const { events, widget } = await startPlaying();

    widget.emit(EVENTS.PLAY_PROGRESS, { currentPosition: 5000 });

    expect(events.onProgress).toHaveBeenCalledExactlyOnceWith(5, DURATION_MS / 1000);
  });

  it('pauses and resumes the widget', async () => {
    const { adapter, events, widget } = await startPlaying();

    adapter.pause();
    expect(widget.pause).toHaveBeenCalledOnce();
    expect(events.onStatus).toHaveBeenLastCalledWith('paused');

    adapter.play();
    expect(widget.play).toHaveBeenCalledTimes(2);
    expect(widget.load).not.toHaveBeenCalled();
  });

  it('seeks the widget in milliseconds', async () => {
    const { adapter, events, widget } = await startPlaying();

    adapter.seek(30);

    expect(widget.seekTo).toHaveBeenCalledExactlyOnceWith(30_000);
    expect(events.onProgress).toHaveBeenLastCalledWith(30, DURATION_MS / 1000);
  });

  it('remembers a position asked for before playing and applies it when the track starts', async () => {
    const { adapter, events } = await makeAdapter(URL_A);

    adapter.seek(40);
    expect(events.onProgress).toHaveBeenLastCalledWith(40, null);

    adapter.play();
    await flush();
    const [widget] = widgets;
    widget.emit(EVENTS.READY);
    await flush();
    widget.emit(EVENTS.PLAY_PROGRESS, { currentPosition: 0 });
    expect(events.onProgress).toHaveBeenLastCalledWith(40, DURATION_MS / 1000);

    widget.emit(EVENTS.PLAY);
    expect(widget.seekTo).toHaveBeenCalledExactlyOnceWith(40_000);
    expect(events.onStatus).toHaveBeenLastCalledWith('playing');
  });

  it('reports the end of the track at its full length', async () => {
    const { events, widget } = await startPlaying();

    widget.emit(EVENTS.FINISH);

    expect(events.onProgress).toHaveBeenLastCalledWith(DURATION_MS / 1000, DURATION_MS / 1000);
    expect(events.onEnded).toHaveBeenCalledOnce();
  });

  it('reports an error of the widget', async () => {
    const { events, widget } = await startPlaying();

    widget.emit(EVENTS.ERROR);

    expect(events.onError).toHaveBeenCalledOnce();
  });

  it('pauses the widget when its player is destroyed', async () => {
    const { adapter, widget } = await startPlaying();

    adapter.destroy();

    expect(widget.pause).toHaveBeenCalledOnce();
  });

  describe('with two players', () => {
    it('loads the second track into the same widget; only its player hears the events', async () => {
      const a = await startPlaying(URL_A);
      const b = await makeAdapter(URL_B, a.plugin);

      b.adapter.play();
      await flush();
      const [url, options] = a.widget.load.mock.calls[0];
      options.callback();
      a.widget.emit(EVENTS.PLAY);

      expect(url).toBe(URL_B);
      expect(options.auto_play).toBe(false);
      expect(widgets).toHaveLength(1);
      expect(document.querySelectorAll('iframe')).toHaveLength(1);
      expect(a.widget.play).toHaveBeenCalledTimes(2);
      expect(b.events.onStatus).toHaveBeenLastCalledWith('playing');
      expect(a.events.onStatus).not.toHaveBeenCalled();
    });

    it('does not touch the widget for a player that does not own it', async () => {
      const a = await startPlaying(URL_A);
      const b = await makeAdapter(URL_B, a.plugin);
      b.adapter.play();
      await flush();

      a.adapter.pause();
      a.adapter.seek(10);
      a.adapter.destroy();

      expect(a.widget.pause).not.toHaveBeenCalled();
      expect(a.widget.seekTo).not.toHaveBeenCalled();
    });
  });

  describe('the widget script', () => {
    const getScript = () => document.head.querySelector<HTMLScriptElement>(`script[src="${API_URL}"]`);

    beforeEach(() => {
      delete (window as TWindow).SC;
    });

    it('is loaded on the first play, and the widget is created once it arrives', async () => {
      const { adapter } = await makeAdapter(URL_A);

      adapter.play();
      await flush();
      expect(getScript()).not.toBeNull();
      expect(widgets).toHaveLength(0);

      installApi();
      getScript().onload(new Event('load'));
      await flush();

      expect(widgets).toHaveLength(1);
    });

    it('reports an error when it cannot be loaded, and tries again on the next play', async () => {
      const { adapter, events } = await makeAdapter(URL_A);
      adapter.play();
      await flush();

      getScript().onerror(new Event('error'));
      await flush();
      expect(events.onError).toHaveBeenCalledOnce();
      expect(getScript()).toBeNull();

      adapter.play();
      await flush();
      expect(getScript()).not.toBeNull();
    });
  });

  describe('the silent audio that keeps the OS media controls with the page', () => {
    it('plays while the track is meant to play and stops with it', async () => {
      const { adapter } = await makeAdapter(URL_A);

      adapter.play();
      expect(mediaPlay).toHaveBeenCalledOnce();
      expect(mediaPause).not.toHaveBeenCalled();

      adapter.pause();
      expect(mediaPause).toHaveBeenCalledOnce();
    });

    it('stops when the track ends', async () => {
      const { widget } = await startPlaying();
      mediaPause.mockClear();

      widget.emit(EVENTS.FINISH);

      expect(mediaPause).toHaveBeenCalledOnce();
    });
  });
});

describe('SoundCloud plugin', () => {
  it.each([
    ['https://soundcloud.com/some-user/some-track', true],
    ['http://m.soundcloud.com/some-user/some-track', true],
    ['https://example.com/soundcloud.com/some-track', false],
    ['https://example.com/a.mp3', false]
  ])('match(%s) is %s', async (url, expected) => {
    expect((await loadPlugin()).match(url)).toBe(expected);
  });

  it('offers a link to the track on SoundCloud', async () => {
    expect((await loadPlugin()).getAction(URL_A)).toEqual({
      kind: 'link',
      href: URL_A,
      label: 'Open on SoundCloud'
    });
  });
});
