import '@/other/player/plugins';
import { trackEvent } from '@/other/analytics';
import { checkConnectivity } from '@/other/connectivity';
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

/**/
export type TPlayerControllerOptions = {
  /** Play the next queued player when this one ends. */
  autoAdvance?: boolean;
  /** Identifies the same player across remounts of its page (see `PlayerManager.acquire`). */
  key?: string;
  /** Page path of the widget, so the dock can lead back to it. */
  originPath?: string;
};

/**
 * One per widget. UI-agnostic store (`subscribe`/`getSnapshot` match
 * `useSyncExternalStore`) wrapping a lazily created source adapter.
 */
export class PlayerController {
  readonly plugin: TPlayerSourcePlugin;
  readonly action: TPlayerAction | null;
  readonly autoAdvance: boolean;
  readonly key: string;
  readonly originPath: string;
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
  /** Which controller adapter events go to; moves along with the adapter on handover. */
  private binding: { target: PlayerController } = { target: this };
  private snapshot: TPlayerSnapshot = INITIAL;
  private listeners = new Set<() => void>();
  /** True until the current track run reports `playing` (reset on switch/restart). */
  private isStartPending = true;

  constructor(
    readonly source: TPlayerSource,
    public title?: string,
    public subtitle?: string,
    readonly trackInfo?: TPlayerTrackInfo,
    { autoAdvance = true, key = source.url, originPath = '' }: TPlayerControllerOptions = {}
  ) {
    this.plugin = getPlugin(source.type ?? detectType(source.url));
    this.action = this.plugin.getAction?.(source.url) ?? null;
    this.autoAdvance = autoAdvance;
    this.key = key;
    this.originPath = originPath;
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

  /** Takes over the running adapter and state of a same-source player whose widget is gone. */
  adoptFrom(other: PlayerController): void {
    this.adapter = other.adapter;
    this.isStartPending = other.isStartPending;
    this.binding = other.binding;
    this.binding.target = this;
    const { snapshot } = other;

    other.adapter = null;
    other.binding = { target: other };
    other.update(INITIAL);
    this.update(snapshot);
  }

  destroy(): void {
    this.adapter?.destroy();
    this.adapter = null;
    this.update(INITIAL);
  }

  /**/
  private getAdapter(): TPlayerAdapter {
    const { binding } = this;
    this.adapter ??= this.plugin.createAdapter(this.source.url, {
      onStatus: (status) => {
        const self = binding.target;
        self.update({ status });
        if (status === 'playing' && self.isStartPending) {
          self.isStartPending = false;
          self.trackStart();
        }
      },
      onProgress: (position, duration) => binding.target.update({ position, duration }),
      onEnded: () => {
        binding.target.update({ status: 'ended' });
        playerManager.handleEnded(binding.target);
      },
      onError: (error) => {
        console.error('Player error:', this.source.url, error);
        binding.target.update({ status: 'error' });
        checkConnectivity();
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
