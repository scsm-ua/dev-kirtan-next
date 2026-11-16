import { act, cleanup, render } from '@testing-library/react';

import PlayerWidget from '@/components/player/PlayerWidget';
import { FAKE_TYPE, fakeUrl, getFakeAdapter, resetPlayers } from '@/tests/helpers/player';

import type { ReactNode } from 'react';
import type { TPlayerAdapterEvents } from '@/types/player';

/**
 * A page of real player widgets on the fake source of `player.ts`, for the
 * player components. Track `name` has the title `Track <name>`.
 */

export const trackTitle = (name: string) => `Track ${name}`;

/** Widgets in DOM order, plus anything else the page needs (dock, sync toggle). */
export function renderPlayerPage(names: string[], { children }: { children?: ReactNode } = {}) {
  return render(
    <>
      {names.map((name) => (
        <PlayerWidget
          className={`Test__${name}`}
          key={name}
          source={{ type: FAKE_TYPE, url: fakeUrl(name) }}
          subtitle={`Subtitle ${name}`}
          title={trackTitle(name)}
        />
      ))}
      {children}
    </>
  );
}

/** Plays the part of the source of track `name` ("now playing", progress, …). */
export function sourceSays(name: string, say: (events: TPlayerAdapterEvents) => void): void {
  act(() => say(getFakeAdapter(name).events));
}

/** Call in `afterEach`: unmounts, lets the widgets unregister, and forgets every player. */
export async function closePlayerPage(): Promise<void> {
  act(() => resetPlayers());
  cleanup();
  // Widgets unregister in a microtask after unmount.
  await Promise.resolve();
  resetPlayers();
}
