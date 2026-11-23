import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { playerManager } from '@/other/player/PlayerManager';
import { useControllerSnapshot, usePlayer } from '@/other/player/usePlayer';
import { PagePathContext } from '@/other/router/pagePath';
import { FAKE_TYPE, fakeUrl, getFakeAdapter, resetPlayers } from '@/tests/helpers/player';

import type { ReactNode } from 'react';

const PAGE_PATH = '/en/some-song/';

/** Lets the delayed teardown of an unmounted widget run. */
const flush = () => act(() => Promise.resolve());

/** Renders the hook as a widget on the page does. */
function renderPlayer(name: string, title = 'Title', autoAdvance?: boolean, path = PAGE_PATH) {
  const element = document.body.appendChild(document.createElement('div'));
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(PagePathContext.Provider, { value: path }, children);

  return renderHook(
    (props: { title: string }) =>
      usePlayer({ type: FAKE_TYPE, url: fakeUrl(name) }, props.title, { current: element }, 'Subtitle', undefined, autoAdvance),
    { initialProps: { title }, wrapper }
  );
}

afterEach(() => {
  resetPlayers();
  document.body.innerHTML = '';
});

describe('usePlayer', () => {
  it('gives the widget an idle player that knows its page', () => {
    const { result } = renderPlayer('a');
    const { controller, isActive, snapshot } = result.current;

    expect(snapshot).toEqual({ status: 'idle', position: 0, duration: null });
    expect(isActive).toBe(false);
    expect(controller.originPath).toBe(PAGE_PATH);
    expect(controller.key).toBe(`${PAGE_PATH}|${fakeUrl('a')}`);
    expect(controller.element?.isConnected).toBe(true);
  });

  it('re-renders the widget when the player becomes active and when its state changes', () => {
    const { result } = renderPlayer('a');

    act(() => result.current.controller.play());
    expect(result.current.isActive).toBe(true);

    act(() => getFakeAdapter('a').events.onStatus('playing'));
    act(() => getFakeAdapter('a').events.onProgress(5, 100));
    expect(result.current.snapshot).toEqual({ status: 'playing', position: 5, duration: 100 });
  });

  it('keeps the same player across re-renders and follows the title', () => {
    const { result, rerender } = renderPlayer('a', 'Old title');
    const { controller } = result.current;

    rerender({ title: 'New title' });

    expect(result.current.controller).toBe(controller);
    expect(controller.title).toBe('New title');
  });

  it('passes auto-advance on', () => {
    expect(renderPlayer('a').result.current.controller.autoAdvance).toBe(true);
    expect(renderPlayer('b', 'Title', false).result.current.controller.autoAdvance).toBe(false);
  });

  it('puts the player in the queue of the page', () => {
    const a = renderPlayer('a');
    renderPlayer('b');

    act(() => a.result.current.controller.play());

    expect(playerManager.getSnapshot().hasNext).toBe(true);
  });

  it('destroys the player of a widget that goes away', async () => {
    const { result, unmount } = renderPlayer('a');
    act(() => result.current.controller.play());
    act(() => playerManager.clearActive());

    unmount();
    await flush();

    expect(getFakeAdapter('a').destroy).toHaveBeenCalledOnce();
    expect(result.current.controller.element).toBeNull();
  });

  it('keeps the active player alive when its page is left, and returns it when the page comes back', async () => {
    const first = renderPlayer('a');
    const { controller } = first.result.current;
    act(() => controller.play());

    first.unmount();
    await flush();

    expect(getFakeAdapter('a').destroy).not.toHaveBeenCalled();
    expect(playerManager.getSnapshot().active).toBe(controller);
    expect(renderPlayer('a').result.current.controller).toBe(controller);
  });

  it('mirrors the playing track of another page: shows and toggles it, never starts its own', async () => {
    const first = renderPlayer('a');
    const playing = first.result.current.controller;
    act(() => playing.play());
    act(() => getFakeAdapter('a').events.onStatus('playing'));
    first.unmount();
    await flush();

    const { result } = renderPlayer('a', 'Title', false, '/en/other-page/');

    expect(result.current.controller).toBe(playing);
    expect(result.current.isActive).toBe(true);
    expect(result.current.snapshot.status).toBe('playing');

    act(() => result.current.controller.toggle());
    expect(getFakeAdapter('a').pause).toHaveBeenCalledOnce();
    expect(playerManager.getSnapshot().active).toBe(playing);

    // The dock is closed: the widget is on its own again.
    act(() => playerManager.clearActive());
    expect(result.current.controller).not.toBe(playing);
    expect(result.current.controller.originPath).toBe('/en/other-page/');
    expect(result.current.isActive).toBe(false);
  });
});

describe('useControllerSnapshot', () => {
  it('gives null without a player', () => {
    expect(renderHook(() => useControllerSnapshot(null)).result.current).toBeNull();
  });
});
