import { getIFrameUrl } from '@/other/helpers';
import type {
  TPlayerAdapter,
  TPlayerAdapterEvents,
  TPlayerSourcePlugin
} from '@/types/player';

/** Subset of https://developers.soundcloud.com/docs/api/html5-widget */
type TScWidget = {
  bind: (event: string, listener: (e?: { currentPosition?: number }) => void) => void;
  load: (url: string, options: Record<string, unknown>) => void;
  play: () => void;
  pause: () => void;
  seekTo: (ms: number) => void;
  getDuration: (callback: (ms: number) => void) => void;
};

const API_URL = 'https://w.soundcloud.com/player/api.js';

/*
 * All SoundCloud adapters share ONE hidden widget iframe and swap tracks
 * via `widget.load()`, so 100 players on a page cost a single iframe.
 */
let apiPromise: Promise<void> | null = null;
let widgetPromise: Promise<TScWidget> | null = null;
let owner: SoundCloudAdapter | null = null;

/**/
function loadApi(): Promise<void> {
  if (window.SC?.Widget) return Promise.resolve();

  apiPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = API_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      apiPromise = null;
      script.remove();
      reject(new Error('SoundCloud API failed to load'));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}

/** Resolves on the first READY, i.e. with `initialUrl` loaded. */
function createWidget(initialUrl: string): Promise<TScWidget> {
  return loadApi().then(
    () =>
      new Promise<TScWidget>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.src = `${getIFrameUrl(initialUrl)}&auto_play=false`;
        // The widget probes EME and registers `unload`; without delegation
        // Chrome logs permissions-policy violations for the cross-origin frame.
        iframe.allow = 'autoplay; encrypted-media; unload';
        iframe.title = 'SoundCloud player';
        iframe.tabIndex = -1;
        iframe.setAttribute('aria-hidden', 'true');
        // Kept inside the viewport: browsers may throttle off-screen iframes.
        // Real size + clip-path (not 1×1px): the widget draws a waveform
        // canvas sized from the frame and throws on a 0-width canvas.
        Object.assign(iframe.style, {
          position: 'fixed',
          left: '0',
          bottom: '0',
          width: '300px',
          height: '166px',
          border: '0',
          opacity: '0',
          clipPath: 'inset(50%)',
          pointerEvents: 'none'
        });
        document.body.appendChild(iframe);

        const widget: TScWidget = window.SC.Widget(iframe);
        const E = window.SC.Widget.Events;

        widget.bind(E.READY, () => resolve(widget));
        widget.bind(E.PLAY, () => owner?.handlePlay());
        widget.bind(E.PAUSE, () => owner?.handlePause());
        widget.bind(E.FINISH, () => owner?.handleFinish());
        widget.bind(E.PLAY_PROGRESS, (e) => owner?.handleProgress(e?.currentPosition));
        widget.bind(E.ERROR, () => owner?.handleError());
      })
  );
}

/**
 *
 */
class SoundCloudAdapter implements TPlayerAdapter {
  private widget: TScWidget | null = null;
  private loaded = false;
  private wantPlay = false;
  private pendingSeek = false;
  private position = 0;
  private duration: number | null = null;

  constructor(private readonly url: string, private readonly events: TPlayerAdapterEvents) {}

  play(): void {
    this.wantPlay = true;

    if (owner === this && this.loaded) {
      this.widget.play();
      return;
    }

    this.events.onStatus('loading');
    if (owner !== this) this.acquire();
  }

  pause(): void {
    this.wantPlay = false;
    if (owner === this && this.loaded) this.widget.pause();
    this.events.onStatus('paused');
  }

  seek(seconds: number): void {
    this.position = seconds;

    if (owner === this && this.loaded) this.widget.seekTo(seconds * 1000);
    else this.pendingSeek = seconds > 0;

    this.events.onProgress(this.position, this.duration);
  }

  destroy(): void {
    this.wantPlay = false;
    if (owner !== this) return;
    owner = null;
    if (this.loaded) this.widget.pause();
  }

  /**/
  private acquire(): void {
    if (owner) owner.release();
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- module-level shared-widget owner
    owner = this;
    this.loaded = false;
    this.pendingSeek = this.position > 0;

    const onLoaded = (widget: TScWidget) => {
      if (owner !== this) return;
      this.widget = widget;
      this.loaded = true;
      widget.getDuration((ms) => {
        if (owner !== this || !ms) return;
        this.duration = ms / 1000;
        this.events.onProgress(this.position, this.duration);
      });
      if (this.wantPlay) widget.play();
    };
    const onFail = (err: unknown) => owner === this && this.events.onError(err);

    if (!widgetPromise) {
      widgetPromise = createWidget(this.url);
      widgetPromise.then(onLoaded, (err) => {
        widgetPromise = null;
        onFail(err);
      });
    } else {
      widgetPromise.then(
        (widget) =>
          widget.load(this.url, { auto_play: false, callback: () => onLoaded(widget) }),
        onFail
      );
    }
  }

  /**/
  private release(): void {
    this.loaded = false;
    this.wantPlay = false;
  }

  handlePlay(): void {
    if (!this.loaded) return;

    if (this.pendingSeek) {
      this.pendingSeek = false;
      this.widget.seekTo(this.position * 1000);
    }
    this.events.onStatus('playing');
  }

  handlePause(): void {
    if (this.loaded) this.events.onStatus('paused');
  }

  handleProgress(ms: number | undefined): void {
    if (!this.loaded || this.pendingSeek || ms == null) return;
    this.position = ms / 1000;
    this.events.onProgress(this.position, this.duration);
  }

  handleFinish(): void {
    if (!this.loaded) return;
    this.wantPlay = false;
    this.position = this.duration ?? this.position;
    this.events.onProgress(this.position, this.duration);
    this.events.onEnded();
  }

  handleError(): void {
    if (this.loaded) this.events.onError();
  }
}

/**/
export const soundCloudPlugin: TPlayerSourcePlugin = {
  type: 'soundcloud',
  match: (url) => /^https?:\/\/([\w-]+\.)?soundcloud\.com\//i.test(url),
  createAdapter: (url, events) => new SoundCloudAdapter(url, events),
  getAction: (url) => ({ kind: 'link', href: url, label: 'Open on SoundCloud' })
};
