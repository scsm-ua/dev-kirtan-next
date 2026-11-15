import type { PlayerController } from '@/other/player/PlayerController';

export type TPlayerDockSnapshot = {
  active: PlayerController | null;
  hasPrev: boolean;
  hasNext: boolean;
};

/** Seconds after which "previous" restarts the current track instead. */
export const RESTART_THRESHOLD = 3;

/**
 * App-wide coordinator: one active player at a time (sync), prev/next and
 * auto-advance through a queue, and dock state.
 *
 * The queue is the DOM order of the players on the page where the active one
 * lives. When that page is left (client navigation), the queue freezes and its
 * players stay alive without widgets, so playback and prev/next continue. It is
 * released when the dock is closed or a player from another page starts.
 */
class PlayerManager {
  /** Players with a mounted widget. */
  private controllers = new Set<PlayerController>();
  private queue: Array<PlayerController> = [];
  private active: PlayerController | null = null;
  private snapshot: TPlayerDockSnapshot = { active: null, hasPrev: false, hasNext: false };
  private listeners = new Set<() => void>();
  private unsubscribeActive: (() => void) | null = null;
  private isEmitQueued = false;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): TPlayerDockSnapshot => this.snapshot;

  /** Player for a mounting widget: the kept-alive one with this key, if its page is shown again. */
  acquire(key: string, create: () => PlayerController): PlayerController {
    return this.queue.find((c) => c.key === key && !this.controllers.has(c)) ?? create();
  }

  register(controller: PlayerController): void {
    this.controllers.add(controller);
    const { active } = this;
    // The active track's page was left and the new page has the same track: continue in its widget.
    if (
      active &&
      active !== controller &&
      !active.element?.isConnected &&
      active.source.url === controller.source.url
    ) {
      controller.adoptFrom(active);
      this.releaseDetached();
      this.setActive(controller);
      return;
    }
    this.queueEmit();
  }

  /** Widget unmounted. Returns `true` when the player is kept alive in the frozen queue. */
  unregister(controller: PlayerController): boolean {
    this.controllers.delete(controller);
    const isKept = !!this.active && this.queue.includes(controller);
    if (!isKept && this.active === controller) this.setActive(null);
    else this.queueEmit();
    return isKept;
  }

  /** One emit per batch: each emit sorts all controllers, so N (un)registers were O(N²). */
  private queueEmit(): void {
    if (!this.active || this.isEmitQueued) return;
    this.isEmitQueued = true;
    queueMicrotask(() => {
      this.isEmitQueued = false;
      if (this.active) this.emit();
    });
  }

  /** Call after players were reordered in the DOM or retitled. */
  refresh(): void {
    if (this.active) this.emit();
  }

  requestPlay(controller: PlayerController): void {
    if (this.active && this.active !== controller) this.active.pause();
    if (!this.queue.includes(controller)) this.releaseDetached();
    this.setActive(controller);
  }

  clearActive = (): void => {
    this.active?.pause();
    this.setActive(null);
  };

  /** Plays the first connected controller in DOM order. */
  playFirst = (): void => {
    let first: PlayerController | null = null;
    for (const c of this.controllers) {
      const el = c.element;
      if (!el?.isConnected) continue;
      if (!first || el.compareDocumentPosition(first.element) & Node.DOCUMENT_POSITION_FOLLOWING) {
        first = c;
      }
    }
    first?.play();
  };

  playNext = (): void => {
    this.getNeighbour(1)?.play();
  };

  playPrev = (): void => {
    const { active } = this;
    if (!active) return;
    const prev = this.getNeighbour(-1);
    if (prev && active.getSnapshot().position <= RESTART_THRESHOLD) prev.play();
    else active.seek(0);
  };

  handleEnded(controller: PlayerController): void {
    if (controller !== this.active || !controller.autoAdvance) return;
    this.getNeighbour(1)?.play();
  }

  /** Player after (1) or before (-1) the active one in the queue. */
  private getNeighbour(direction: 1 | -1): PlayerController | null {
    const index = this.active ? this.queue.indexOf(this.active) : -1;
    return index < 0 ? null : (this.queue[index + direction] ?? null);
  }

  /** Connected players in DOM order. */
  private getPageOrder(): Array<PlayerController> {
    return [...this.controllers]
      .filter((c) => c.element?.isConnected)
      .sort((a, b) =>
        a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      );
  }

  /** Destroys kept-alive players whose page is gone and empties the queue. */
  private releaseDetached(): void {
    const detached = this.queue.filter((c) => !this.controllers.has(c));
    this.queue = [];
    detached.forEach((c) => c.destroy());
  }

  /**/
  private setActive(controller: PlayerController | null): void {
    if (this.active === controller) return;
    this.unsubscribeActive?.();
    this.active = controller;
    this.unsubscribeActive = controller?.subscribe(() => this.syncPlaybackState()) ?? null;
    if (!controller) this.releaseDetached();
    this.emit();
  }

  /** Keeps OS media controls (media keys, lock screen) in sync with the active track. */
  private syncMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const { mediaSession } = navigator;
    const { active, hasNext } = this.snapshot;

    mediaSession.metadata = active
      ? new MediaMetadata({ title: active.title ?? '', artist: active.subtitle ?? '' })
      : null;
    this.syncPlaybackState();

    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ['play', active ? () => active.play() : null],
      ['pause', active ? () => active.pause() : null],
      ['previoustrack', active ? this.playPrev : null],
      ['nexttrack', active && hasNext ? this.playNext : null]
    ];
    for (const [action, handler] of handlers) {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported by this browser.
      }
    }
  }

  /**/
  private syncPlaybackState(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const { active } = this;
    const { mediaSession } = navigator;
    mediaSession.playbackState = !active ? 'none' : active.isBusy() ? 'playing' : 'paused';

    // Explicit position: the element playing in this document may not be the real track.
    const { position = 0, duration = null } = active?.getSnapshot() ?? {};
    mediaSession.setPositionState?.(
      duration ? { duration, position: Math.min(position, duration), playbackRate: 1 } : undefined
    );
  }

  /**/
  private emit(): void {
    const { active } = this;
    // A disconnected active player means its page was left: keep the queue it came from.
    if (active?.element?.isConnected) this.queue = this.getPageOrder();
    const index = active ? this.queue.indexOf(active) : -1;
    this.snapshot = {
      active,
      hasPrev: index > 0,
      hasNext: index >= 0 && index < this.queue.length - 1
    };
    this.syncMediaSession();
    this.listeners.forEach((listener) => listener());
  }
}

/**/
export const playerManager = new PlayerManager();
