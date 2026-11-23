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
 * The queue is the playlist where play was pressed: the DOM order of the players
 * of that page. It follows a new sort of that page (`refresh`) and nothing else:
 * it survives navigation, its players stay alive without widgets, so playback and
 * prev/next continue, and other pages cannot change it. It is taken again when the
 * user starts another track, and released when the dock is closed. A page that
 * has the playing track only mirrors it (`getShown`), the queue stays.
 */
class PlayerManager {
  /** Players with a mounted widget. */
  private controllers = new Set<PlayerController>();
  private queue: Array<PlayerController> = [];
  private active: PlayerController | null = null;
  /** True while the manager itself moves through the queue (next, previous, auto-advance). */
  private isQueueMove = false;
  /** State of the page shown now (e.g. its sort), as its component last reported it. */
  private pageView: { path: string; view: unknown } | null = null;
  /** `pageView` of the queue's page when the queue was last taken, restored when that page is shown again. */
  private playlistView: unknown = null;
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
    this.queueEmit();
  }

  /**
   * Player a widget shows: the active one when it plays the same track from another page
   * (the widget mirrors it, the queue stays), otherwise the widget's own.
   */
  getShown = (controller: PlayerController): PlayerController => {
    const { active } = this;
    return active &&
      active !== controller &&
      active.originPath !== controller.originPath &&
      active.source.url === controller.source.url
      ? active
      : controller;
  };

  /** The active player while the shown page has it: as its own widget or mirrored. */
  getActiveOnPage = (): PlayerController | null => {
    const { active } = this;
    if (!active) return null;
    if (active.element?.isConnected) return active;
    for (const c of this.controllers) {
      if (c !== active && this.getShown(c) === active) return active;
    }
    return null;
  };

  /** A page reports its current state (before `refresh`); it is kept with the queue taken on that page. */
  setPageView(path: string, view: unknown): void {
    this.pageView = { path, view };
  }

  /** State the page of the queue had when it was last shown; `null` for any other page. */
  getPlaylistView(originPath: string): unknown {
    return this.active?.originPath === originPath ? this.playlistView : null;
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

  /**
   * Call after players were reordered in the DOM or retitled. On the page of the queue the
   * queue follows the new order; on any other page only the dock is updated.
   */
  refresh(): void {
    const { active } = this;
    if (!active) return;
    if (active.element?.isConnected) this.takeQueue(active);
    this.emit();
  }

  requestPlay(controller: PlayerController): void {
    if (this.active && this.active !== controller) this.active.pause();
    const isInQueue = this.queue.includes(controller);
    if (!isInQueue) this.releaseDetached();
    // The user started a track (not resume, next, previous or auto-advance): its page as it
    // looks now becomes the playlist.
    if (!isInQueue || (!this.isQueueMove && this.active !== controller)) this.takeQueue(controller);
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
    this.move(this.getNeighbour(1));
  };

  playPrev = (): void => {
    const { active } = this;
    if (!active) return;
    const prev = this.getNeighbour(-1);
    if (prev && active.getSnapshot().position <= RESTART_THRESHOLD) this.move(prev);
    else active.seek(0);
  };

  handleEnded(controller: PlayerController): void {
    if (controller !== this.active || !controller.autoAdvance) return;
    this.move(this.getNeighbour(1));
  }

  /** Plays another player of the queue without taking the queue again. */
  private move(controller: PlayerController | null): void {
    this.isQueueMove = true;
    try {
      controller?.play();
    } finally {
      this.isQueueMove = false;
    }
  }

  /** The page of `controller`, as it looks now, becomes the queue. */
  private takeQueue(controller: PlayerController): void {
    const order = this.getPageOrder();
    this.queue = order.includes(controller) ? order : [controller];
    const { pageView } = this;
    this.playlistView = pageView?.path === controller.originPath ? pageView.view : null;
  }

  /**
   * Player after (1) or before (-1) the active one in the queue. A looped queue is a circle:
   * after its last player comes the first one, before the first one the last. Its only player
   * is its own next (it plays again when it ends), but has no previous.
   */
  private getNeighbour(direction: 1 | -1): PlayerController | null {
    const { active, queue } = this;
    const index = active ? queue.indexOf(active) : -1;
    if (index < 0) return null;
    const { length } = queue;
    if (!active.loop || (length === 1 && direction === -1)) return queue[index + direction] ?? null;
    return queue[(index + direction + length) % length];
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
    this.playlistView = null;
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
    const index = active ? this.queue.indexOf(active) : -1;
    // A looped queue has a previous and a next track at its ends too, unless it is a single track.
    const isCircle = index >= 0 && active.loop && this.queue.length > 1;
    this.snapshot = {
      active,
      hasPrev: index > 0 || isCircle,
      hasNext: (index >= 0 && index < this.queue.length - 1) || isCircle
    };
    this.syncMediaSession();
    this.listeners.forEach((listener) => listener());
  }
}

/**/
export const playerManager = new PlayerManager();
