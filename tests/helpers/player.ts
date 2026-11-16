import { vi } from 'vitest';

import { PlayerController } from '@/other/player/PlayerController';
import { playerManager } from '@/other/player/PlayerManager';
import { getPlugin, registerPlugin } from '@/other/player/registry';

import type { TPlayerControllerOptions } from '@/other/player/PlayerController';
import type { TPlayerAdapterEvents, TPlayerTrackInfo } from '@/types/player';

/**
 * A player source for tests: no network and no media element. Each adapter
 * records what the controller asks for, and `events` lets the test play the
 * part of the real source ("now playing", "ended", …).
 */

export const FAKE_TYPE = 'fake';

type TFakeAdapter = {
  events: TPlayerAdapterEvents;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  seek: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const adapters = new Map<string, TFakeAdapter>();
const mounted: Array<{ controller: PlayerController; element: HTMLElement }> = [];

registerPlugin({
  type: FAKE_TYPE,
  match: () => false,
  createAdapter: (url, events) => {
    const adapter = { events, play: vi.fn(), pause: vi.fn(), seek: vi.fn(), destroy: vi.fn() };
    adapters.set(url, adapter);
    return adapter;
  },
  getAction: (url) => ({ kind: 'link', href: url, label: 'Open' })
});

/**
 * From now on, in this test file, every source without an explicit type
 * (real SoundCloud and audio URLs) plays on the fake source.
 */
export function fakeAllSources(): void {
  registerPlugin({ ...getPlugin(FAKE_TYPE), type: `${FAKE_TYPE}-all`, match: () => true });
}

/** The adapter of the player of a real URL, after `fakeAllSources()`. */
export const getAdapterOf = (url: string) => adapters.get(url);

/**/
export const fakeUrl = (name: string) => `fake:${name}`;

/** The adapter of a player, or `undefined` while the player has never played. */
export const getFakeAdapter = (name: string) => adapters.get(fakeUrl(name));

/** A controller that is not on any page yet. */
export function makeController(
  name: string,
  options: TPlayerControllerOptions & { trackInfo?: TPlayerTrackInfo } = {}
): PlayerController {
  const { trackInfo, ...rest } = options;
  return new PlayerController({ type: FAKE_TYPE, url: fakeUrl(name) }, `Title ${name}`, 'Subtitle', trackInfo, rest);
}

/** Puts a player on the page, as a mounted widget does. */
export function mountPlayer(controller: PlayerController): HTMLElement {
  const element = document.body.appendChild(document.createElement('div'));
  controller.setElement(element);
  playerManager.register(controller);
  mounted.push({ controller, element });

  return element;
}

/** Controllers on the page, in DOM order, named `a`, `b`, … */
export function mountPlayers(names: string[], options?: TPlayerControllerOptions): PlayerController[] {
  return names.map((name) => {
    const controller = makeController(name, options);
    mountPlayer(controller);
    return controller;
  });
}

/** Leaves the page, as a client navigation does: widgets unmount, elements go away. */
export function leavePage(): void {
  mounted.splice(0).forEach(({ controller, element }) => {
    element.remove();
    controller.setElement(null);
    if (!playerManager.unregister(controller)) controller.destroy();
  });
}

/** Call after each test: closes the dock and forgets every fake player. */
export function resetPlayers(): void {
  playerManager.clearActive();
  leavePage();
  adapters.clear();
}
