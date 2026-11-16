import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GroupTitle from '@/components/contents/GroupTitle';

const LINE = 20;
const FREE_WIDTH = 300;

/**
 * Fake layout: a title is `lines(width)` lines high at a given width; with no
 * width set it takes FREE_WIDTH.
 */
function stubLayout(lines: (width: number) => number) {
  const widthOf = (el: HTMLElement) => (el.style.width ? parseInt(el.style.width) : FREE_WIDTH);

  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return widthOf(this);
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return lines(widthOf(this)) * LINE;
  });
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({ lineHeight: `${LINE}px` } as CSSStyleDeclaration);
}

function settle() {
  for (let step = 0; step < 200; step++) {
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('GroupTitle', () => {
  it('shows the title', () => {
    stubLayout(() => 1);
    const { container } = render(<GroupTitle title="Songs of Prayer" />);

    expect(container.textContent).toBe('Songs of Prayer');
  });

  it('keeps a one-line title at its natural width', () => {
    stubLayout(() => 1);
    const { container } = render(<GroupTitle title="Short" />);
    settle();

    expect((container.firstChild as HTMLElement).style.width).toBe('');
  });

  it('narrows a two-line title to the narrowest width that still fits in two lines', () => {
    stubLayout((width) => (width < 150 ? 3 : 2));
    const { container } = render(<GroupTitle title="A long title that wraps" />);
    settle();

    expect((container.firstChild as HTMLElement).style.width).toBe('150px');
  });
});
