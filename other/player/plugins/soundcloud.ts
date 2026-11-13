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

/*
 * Browsers route media keys to the frame that plays audio, i.e. the widget
 * iframe. An inaudible looping <audio> in this document keeps the page's own
 * Media Session (title, next/prev handlers) in charge.
 */
let anchor: HTMLAudioElement | null = null;
let claimTimer: ReturnType<typeof setTimeout> | undefined;

/**/
function createSilentWavUrl(): string {
  const sampleRate = 8000;
  // Chrome gives no media controls to sounds shorter than 5 seconds.
  const dataSize = sampleRate * 6 * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeTag = (offset: number, tag: string) => {
    for (let i = 0; i < tag.length; i++) view.setUint8(offset + i, tag.charCodeAt(i));
  };

  // 16-bit mono PCM header.
  writeTag(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeTag(8, 'WAVE');
  writeTag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeTag(36, 'data');
  view.setUint32(40, dataSize, true);
  // Constant non-zero level: no sound, but Firefox ignores digitally silent media.
  new Int16Array(buffer, 44).fill(32);

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

/** Firefox and Safari follow the frame that started playing last: restart the anchor. */
function claimMediaSession(): void {
  if (!anchor || anchor.paused) return;
  anchor.pause();
  anchor.play().catch(() => {});
}

/** The anchor plays exactly while the owner is meant to be playing. */
function syncAnchor(): void {
  if (!owner?.wantPlay) {
    anchor?.pause();
    return;
  }

  if (!anchor) {
    anchor = new Audio(createSilentWavUrl());
    anchor.loop = true;
  }
  if (anchor.paused) anchor.play().catch(() => {});
}

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
  wantPlay = false;
  private pendingSeek = false;
  private position = 0;
  private duration: number | null = null;

  constructor(private readonly url: string, private readonly events: TPlayerAdapterEvents) {}

  play(): void {
    this.wantPlay = true;

    if (owner === this && this.loaded) {
      this.widget.play();
      syncAnchor();
      return;
    }

    this.events.onStatus('loading');
    if (owner !== this) this.acquire();
    syncAnchor();
  }

  pause(): void {
    this.wantPlay = false;
    if (owner === this && this.loaded) this.widget.pause();
    syncAnchor();
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
    syncAnchor();
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
    const onFail = (err: unknown) => {
      if (owner !== this) return;
      this.wantPlay = false;
      syncAnchor();
      this.events.onError(err);
    };

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

    claimMediaSession();
    // Again later: the widget's sound may start after its PLAY event.
    clearTimeout(claimTimer);
    claimTimer = setTimeout(claimMediaSession, 2000);
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
    // After onEnded: auto-advance may already have started the next track.
    syncAnchor();
  }

  handleError(): void {
    if (!this.loaded) return;
    this.wantPlay = false;
    syncAnchor();
    this.events.onError();
  }
}

/**/
export const soundCloudPlugin: TPlayerSourcePlugin = {
  type: 'soundcloud',
  match: (url) => /^https?:\/\/([\w-]+\.)?soundcloud\.com\//i.test(url),
  createAdapter: (url, events) => new SoundCloudAdapter(url, events),
  getAction: (url) => ({ kind: 'link', href: url, label: 'Open on SoundCloud' })
};
