import type {
  TPlayerAdapter,
  TPlayerAdapterEvents,
  TPlayerSourcePlugin
} from '@/types/player';

/*
 * All audio adapters share ONE <audio> element: only the owner holds `src`,
 * so paused players never keep a connection open, and mobile browsers that
 * unlock media per element keep allowing playlist auto-advance.
 */
let element: HTMLAudioElement | null = null;
let owner: AudioAdapter | null = null;

/**/
function getElement(): HTMLAudioElement {
  if (element) return element;

  const el = new Audio();
  el.preload = 'none';

  const on = (type: string, handler: (o: AudioAdapter) => void) =>
    el.addEventListener(type, () => owner && handler(owner));

  on('loadedmetadata', (o) => o.handleMetadata());
  on('durationchange', (o) => o.handleTime());
  on('timeupdate', (o) => o.handleTime());
  on('playing', (o) => o.events.onStatus('playing'));
  on('waiting', (o) => !el.paused && o.events.onStatus('loading'));
  // A stale `pause` from the previous owner may arrive after the switch.
  on('pause', (o) => el.paused && !el.ended && o.events.onStatus('paused'));
  on('ended', (o) => o.handleEnded());
  on('error', (o) => o.events.onError(el.error));

  element = el;
  return el;
}

/**/
function getDuration(el: HTMLAudioElement): number | null {
  return isFinite(el.duration) && el.duration > 0 ? el.duration : null;
}

/**
 *
 */
class AudioAdapter implements TPlayerAdapter {
  private position = 0;
  private duration: number | null = null;
  private pendingSeek = false;

  constructor(private readonly url: string, readonly events: TPlayerAdapterEvents) {}

  play(): void {
    const el = getElement();

    if (owner !== this) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- module-level shared-element owner
      owner = this;
      el.src = this.url;
      this.pendingSeek = this.position > 0;
    }

    this.events.onStatus('loading');
    el.play().catch((err: DOMException) => {
      if (owner !== this || err?.name === 'AbortError') return;
      if (err?.name === 'NotAllowedError') this.events.onStatus('paused');
      else this.events.onError(err);
    });
  }

  pause(): void {
    if (owner === this) element.pause();
    this.events.onStatus('paused');
  }

  seek(seconds: number): void {
    this.position = seconds;

    if (owner === this && element.readyState >= HTMLMediaElement.HAVE_METADATA) {
      element.currentTime = seconds;
    } else {
      this.pendingSeek = true;
    }

    this.events.onProgress(this.position, this.duration);
  }

  destroy(): void {
    if (owner !== this) return;
    owner = null;
    element.pause();
    element.removeAttribute('src');
    element.load();
  }

  handleMetadata(): void {
    if (this.pendingSeek) {
      this.pendingSeek = false;
      element.currentTime = this.position;
    }
    this.handleTime();
  }

  handleTime(): void {
    // Before metadata, currentTime is 0 and would clobber the restored position.
    if (this.pendingSeek) return;
    this.position = element.currentTime;
    this.duration = getDuration(element) ?? this.duration;
    this.events.onProgress(this.position, this.duration);
  }

  handleEnded(): void {
    this.position = this.duration ?? this.position;
    this.events.onProgress(this.position, this.duration);
    this.events.onEnded();
  }
}

/**/
export const audioPlugin: TPlayerSourcePlugin = {
  type: 'audio',
  match: (url) => /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)([?#]|$)/i.test(url),
  createAdapter: (url, events) => new AudioAdapter(url, events),
  getAction: (url) => ({ kind: 'download', href: url, label: 'Download' })
};
