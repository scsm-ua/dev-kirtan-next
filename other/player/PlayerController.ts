import '@/other/player/plugins';
import { trackEvent } from '@/other/analytics';
import { playerManager } from '@/other/player/PlayerManager';
import { detectType, getPlugin } from '@/other/player/registry';
import type {
  TPlayerAction,
  TPlayerAdapter,
  TPlayerSnapshot,
  TPlayerSource,
  TPlayerSourcePlugin,
  TPlayerTrackInfo
} from '@/types/player';

const INITIAL: TPlayerSnapshot = { status: 'idle', position: 0, duration: null };

/**
 * One per widget. UI-agnostic store (`subscribe`/`getSnapshot` match
 * `useSyncExternalStore`) wrapping a lazily created source adapter.
 */
export class PlayerController {
  readonly plugin: TPlayerSourcePlugin;
  readonly action: TPlayerAction | null;
  element: HTMLElement | null = null;

  setElement(element: HTMLElement | null): void {
    this.element = element;
  }

  /** Silent; call `playerManager.refresh()` to update the dock. */
  setTitle(title?: string, subtitle?: string): void {
    this.title = title;
    this.subtitle = subtitle;
  }

  private adapter: TPlayerAdapter | null = null;
  private snapshot: TPlayerSnapshot = INITIAL;
  private listeners = new Set<() => void>();
  /** True until the current track run reports `playing` (reset on switch/restart). */
  private isStartPending = true;

  constructor(
    readonly source: TPlayerSource,
    public title?: string,
    public subtitle?: string,
    readonly trackInfo?: TPlayerTrackInfo
  ) {
    this.plugin = getPlugin(source.type ?? detectType(source.url));
    this.action = this.plugin.getAction?.(source.url) ?? null;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): TPlayerSnapshot => this.snapshot;

  /**/
  isBusy(): boolean {
    const { status } = this.snapshot;
    return status === 'playing' || status === 'loading';
  }

  toggle = (): void => (this.isBusy() ? this.pause() : this.play());

  play = (): void => {
    // Switching to another track restarts it; resuming the active one keeps its position.
    const isSwitch = playerManager.getSnapshot().active !== this;
    playerManager.requestPlay(this);
    const adapter = this.getAdapter();
    const { status, position } = this.snapshot;
    if (status === 'ended' || (isSwitch && position > 0)) adapter.seek(0);
    if (status === 'ended' || isSwitch) this.isStartPending = true;
    adapter.play();
  };

  pause = (): void => {
    if (this.isBusy()) this.adapter?.pause();
  };

  seek = (seconds: number): void => {
    this.getAdapter().seek(seconds);
    if (this.snapshot.status === 'ended') this.update({ status: 'paused' });
  };

  seekBy = (delta: number): void => {
    const { position, duration } = this.snapshot;
    if (duration == null) return;
    this.seek(Math.min(duration, Math.max(0, position + delta)));
  };

  destroy(): void {
    this.adapter?.destroy();
    this.adapter = null;
    this.update(INITIAL);
  }

  /**/
  private getAdapter(): TPlayerAdapter {
    this.adapter ??= this.plugin.createAdapter(this.source.url, {
      onStatus: (status) => {
        this.update({ status });
        if (status === 'playing' && this.isStartPending) {
          this.isStartPending = false;
          this.trackStart();
        }
      },
      onProgress: (position, duration) => this.update({ position, duration }),
      onEnded: () => {
        this.update({ status: 'ended' });
        playerManager.handleEnded(this);
      },
      onError: (error) => {
        console.error('Player error:', this.source.url, error);
        this.update({ status: 'error' });
      }
    });
    return this.adapter;
  }

  /**/
  private trackStart(): void {
    if (!this.trackInfo) return;
    const { bookId, pageType, singer, title } = this.trackInfo;
    trackEvent('player_start', {
      songbook: bookId,
      // Overrides the config-level page_type (e.g. 'audio-singer') for this event.
      page_type: pageType,
      singer,
      title
    });
  }

  /**/
  private update(patch: Partial<TPlayerSnapshot>): void {
    const prev = this.snapshot;
    const changed = (Object.keys(patch) as Array<keyof TPlayerSnapshot>).some(
      (key) => patch[key] !== prev[key]
    );
    if (!changed) return;

    this.snapshot = { ...prev, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
