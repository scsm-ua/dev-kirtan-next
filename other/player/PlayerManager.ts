import type { PlayerController } from '@/other/player/PlayerController';

export type TPlayerDockSnapshot = {
  active: PlayerController | null;
  hasPrev: boolean;
  hasNext: boolean;
};

/** Seconds after which "previous" restarts the current track instead. */
export const RESTART_THRESHOLD = 3;

/**
 * Page-wide coordinator: one active player at a time (sync), auto-advance
 * to the next player in DOM order (playlist), and dock state.
 */
class PlayerManager {
  private controllers = new Set<PlayerController>();
  private active: PlayerController | null = null;
  private snapshot: TPlayerDockSnapshot = { active: null, hasPrev: false, hasNext: false };
  private listeners = new Set<() => void>();
  private unsubscribeActive: (() => void) | null = null;
  private isEmitQueued = false;
  /** Play the next player in DOM order when the active one ends. */
  autoAdvance = true;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): TPlayerDockSnapshot => this.snapshot;

  register(controller: PlayerController): void {
    this.controllers.add(controller);
    this.queueEmit();
  }

  unregister(controller: PlayerController): void {
    this.controllers.delete(controller);
    if (this.active === controller) this.setActive(null);
    else this.queueEmit();
  }

  /** One emit per batch: each emit scans all controllers, so N (un)registers were O(N²). */
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
    if (this.active) this.getSibling(this.active, 1)?.play();
  };

  playPrev = (): void => {
    const { active } = this;
    if (!active) return;
    const prev = this.getSibling(active, -1);
    if (prev && active.getSnapshot().position <= RESTART_THRESHOLD) prev.play();
    else active.seek(0);
  };

  handleEnded(controller: PlayerController): void {
    if (controller !== this.active || !this.autoAdvance) return;
    this.getSibling(controller, 1)?.play();
  }

  /** Nearest connected controller after (1) or before (-1) `current` in DOM order. */
  private getSibling(current: PlayerController, direction: 1 | -1): PlayerController | null {
    const from = current.element;
    if (!from?.isConnected) return null;

    const toward =
      direction === 1 ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING;
    let found: PlayerController | null = null;
    for (const c of this.controllers) {
      const el = c.element;
      if (!el?.isConnected || c === current) continue;
      const isToward = from.compareDocumentPosition(el) & toward;
      const isCloser = !found || el.compareDocumentPosition(found.element) & toward;
      if (isToward && isCloser) found = c;
    }
    return found;
  }

  /**/
  private setActive(controller: PlayerController | null): void {
    if (this.active === controller) return;
    this.unsubscribeActive?.();
    this.active = controller;
    this.unsubscribeActive = controller?.subscribe(() => this.syncPlaybackState()) ?? null;
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
    this.snapshot = {
      active,
      hasPrev: !!active && !!this.getSibling(active, -1),
      hasNext: !!active && !!this.getSibling(active, 1)
    };
    this.syncMediaSession();
    this.listeners.forEach((listener) => listener());
  }
}

/**/
export const playerManager = new PlayerManager();
