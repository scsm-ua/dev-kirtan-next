import { act, render } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SwipeNav } from '@/components/song/PrevNextNav/SwipeNav';
import { notifyLocationChange } from '@/other/router/location';
import { setNavigationHandler } from '@/other/router/navigate';
import { getBookIds, getItems } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

import type { TNavItem, TNavItems } from '@/types/song';

let both: TNavItems;
let onlyNext: TNavItems;
let navigateTo: ReturnType<typeof vi.fn<(url: URL) => void>>;

/** Neighbours of the first song listed once at the given position of some book. */
async function loadNav(position: (count: number) => number): Promise<TNavItems> {
  for (const bookId of getBookIds()) {
    const items = getItems(bookId);
    const item = items[position(items.length)];
    if (item.type === 'page' || items.filter(({ id }) => id === item.id).length > 1) continue;

    const { nav } = (await loadPage({ kind: 'item', bookId, slug: item.id }, 'song')).data;
    return Object.values(nav)[0];
  }

  throw new Error('No real song at that position of any book.');
}

beforeAll(async () => {
  both = await loadNav((count) => Math.floor(count / 2));
  onlyNext = await loadNav(() => 0);

  // Guard: a song in the middle has both neighbours, the first one has no previous.
  expect(both.prev && both.next).toBeTruthy();
  expect(onlyNext.prev).toBeUndefined();
  expect(onlyNext.next).toBeTruthy();
});

beforeEach(() => {
  navigateTo = vi.fn();
  setNavigationHandler(navigateTo);
});

afterEach(() => {
  setNavigationHandler(null);
  document.body.style.overflow = '';
  window.getSelection()?.removeAllRanges();
});

function touch(type: string, x: number, y: number, target: Element = document.body): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: [{ clientX: x, clientY: y }] });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

/** A finger moving by (dx, dy) in small steps, then lifted. */
function swipe(dx: number, dy = 0, { lift = true, target = document.body as Element } = {}): Event[] {
  const moves: Event[] = [];
  touch('touchstart', 200, 300, target);
  for (const part of [0.1, 0.5, 1]) moves.push(touch('touchmove', 200 + dx * part, 300 + dy * part, target));
  if (lift) touch('touchend', 0, 0, target);
  return moves;
}

function navigatedTo(): string[] {
  return navigateTo.mock.calls.map(([url]: [URL]) => url.pathname + url.search);
}

const pathOf = (item: TNavItem | void) => (item ? item.path : '');
const circles = (container: HTMLElement) => container.querySelectorAll('.SwipeNav');

describe('SwipeNav: finger swipe', () => {
  it('opens the next song on a long swipe to the left', () => {
    render(<SwipeNav prevNext={both} />);
    swipe(-200);

    expect(navigatedTo()).toEqual([pathOf(both.next)]);
  });

  it('opens the previous song on a long swipe to the right', () => {
    render(<SwipeNav prevNext={both} />);
    swipe(200);

    expect(navigatedTo()).toEqual([pathOf(both.prev)]);
  });

  it('does nothing on a short swipe and hides the indicator on release', () => {
    const { container } = render(<SwipeNav prevNext={both} />);
    swipe(-100, 0, { lift: false });

    expect(circles(container)).toHaveLength(1);
    expect(circles(container)[0].classList.contains('SwipeNav--ready')).toBe(false);

    touch('touchend', 0, 0);

    expect(navigatedTo()).toEqual([]);
    expect(circles(container)).toHaveLength(0);
  });

  it('shows the indicator only after 30 px and marks it ready at full length', () => {
    const { container } = render(<SwipeNav prevNext={both} />);

    swipe(-25, 0, { lift: false });
    expect(circles(container)).toHaveLength(0);

    touch('touchmove', 200 - 150, 300);
    expect(circles(container)).toHaveLength(1);
    expect(circles(container)[0].classList.contains('SwipeNav--ready')).toBe(true);
  });

  it('takes over horizontal moves and leaves vertical scrolling alone', () => {
    render(<SwipeNav prevNext={both} />);

    expect(swipe(-200).every((move) => move.defaultPrevented)).toBe(true);
    expect(swipe(20, -200).some((move) => move.defaultPrevented)).toBe(false);
    expect(navigatedTo()).toEqual([pathOf(both.next)]);
  });

  it('does not navigate again on a tap after a swipe (it stays mounted on the next song)', () => {
    const { container, rerender } = render(<SwipeNav prevNext={both} />);
    swipe(-200);
    rerender(<SwipeNav prevNext={onlyNext} />);

    touch('touchstart', 200, 300);
    touch('touchend', 0, 0);

    expect(navigatedTo()).toEqual([pathOf(both.next)]);
    expect(circles(container)).toHaveLength(0);
  });

  it('does nothing towards a side with no song', () => {
    const { container } = render(<SwipeNav prevNext={onlyNext} />);
    swipe(200, 0, { lift: false });

    expect(circles(container)).toHaveLength(0);

    touch('touchend', 0, 0);
    expect(navigatedTo()).toEqual([]);
  });

  it('ignores a swipe that starts on a slider (the player seek bar)', () => {
    const slider = document.createElement('div');
    slider.setAttribute('role', 'slider');
    document.body.append(slider);
    render(<SwipeNav prevNext={both} />);

    swipe(-200, 0, { target: slider });
    slider.remove();

    expect(navigatedTo()).toEqual([]);
  });

  it('ignores swipes while a modal locks the page scroll', () => {
    render(<SwipeNav prevNext={both} />);
    document.body.style.overflow = 'hidden';
    swipe(-200);

    expect(navigatedTo()).toEqual([]);
  });

  it('does not navigate when the swipe selected text', () => {
    render(<SwipeNav prevNext={both} />);
    const text = document.createElement('p');
    text.textContent = 'some selectable text';
    document.body.append(text);
    swipe(-200, 0, { lift: false });
    window.getSelection().selectAllChildren(text);
    touch('touchend', 0, 0);
    text.remove();

    expect(navigatedTo()).toEqual([]);
  });

  it('vibrates once when the swipe reaches full length', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    render(<SwipeNav prevNext={both} />);

    swipe(-200, 0, { lift: false });
    touch('touchmove', 200 - 250, 300);

    expect(vibrate).toHaveBeenCalledTimes(1);
    delete (navigator as { vibrate?: unknown }).vibrate;
  });

  it('stops listening after unmount', () => {
    const { unmount } = render(<SwipeNav prevNext={both} />);
    unmount();
    swipe(-200);

    expect(navigatedTo()).toEqual([]);
  });
});

describe('SwipeNav: hotkeys', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function press(event: 'kirtan:prevSong' | 'kirtan:nextSong') {
    act(() => {
      window.dispatchEvent(new CustomEvent(event));
    });
  }

  it.each([
    ['kirtan:nextSong', 'next'],
    ['kirtan:prevSong', 'prev']
  ] as const)('%s opens the %s song at once', (event, side) => {
    render(<SwipeNav prevNext={both} />);
    press(event);

    expect(navigatedTo()).toEqual([pathOf(both[side])]);
  });

  it('shows the circle only after the page has switched', () => {
    render(<SwipeNav prevNext={both} />);
    press('kirtan:nextSong');
    const circle = () => document.body.querySelector<HTMLElement>(':scope > .SwipeNav');
    expect(circle()?.style.opacity ?? '0').toBe('0');

    act(() => notifyLocationChange());
    expect(circle()?.style.opacity).toBe('1');
    expect(circle()?.querySelector('.SwipeNav__arrow--flip')).toBeNull();

    vi.advanceTimersByTime(1000);
    expect(circle()?.style.opacity).toBe('0');
  });

  it('skips the circle when the page does not switch in time', () => {
    render(<SwipeNav prevNext={both} />);
    press('kirtan:prevSong');
    vi.advanceTimersByTime(5000);
    const before = document.body.querySelector<HTMLElement>(':scope > .SwipeNav')?.style.opacity;

    act(() => notifyLocationChange());
    expect(document.body.querySelector<HTMLElement>(':scope > .SwipeNav')?.style.opacity).toBe(before);
  });

  it('does nothing when there is no song on that side', () => {
    render(<SwipeNav prevNext={onlyNext} />);
    press('kirtan:prevSong');
    vi.advanceTimersByTime(1000);

    expect(navigatedTo()).toEqual([]);
  });

  it('uses the neighbours of the latest render', () => {
    const { rerender } = render(<SwipeNav prevNext={onlyNext} />);
    rerender(<SwipeNav prevNext={both} />);
    press('kirtan:prevSong');
    vi.advanceTimersByTime(1000);

    expect(navigatedTo()).toEqual([pathOf(both.prev)]);
  });

  it('stops listening after unmount', () => {
    const { unmount } = render(<SwipeNav prevNext={both} />);
    unmount();
    press('kirtan:nextSong');
    vi.advanceTimersByTime(1000);

    expect(navigatedTo()).toEqual([]);
  });
});
