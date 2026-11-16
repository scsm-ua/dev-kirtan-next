import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GlobalHotkeys from '@/components/common/GlobalHotkeys/GlobalHotkeys';
import { navigate } from '@/other/router/navigate';
import { getBookIds } from '@/tests/helpers/books';
import { endModalFadeOut } from '@/tests/helpers/modal';

vi.mock('@/other/router/navigate', () => ({ navigate: vi.fn() }));

const [bookId] = getBookIds();

beforeEach(() => {
  vi.mocked(navigate).mockClear();
  window.history.replaceState(null, '', `/${bookId}/contents/`);
});

afterEach(() => {
  vi.useRealTimers();
});

const press = (key: string) => fireEvent.keyDown(window, { key });
const isOpen = () => !!screen.queryByRole('dialog') && !screen.getByRole('dialog').getAttribute('style')?.includes('out');

function closeAndSettle() {
  endModalFadeOut();
  expect(screen.queryByRole('dialog')).toBeNull();
}

describe('GlobalHotkeys', () => {
  it('opens the help on "h" and closes it on the next "h"', () => {
    render(<GlobalHotkeys bookId={bookId} />);
    expect(isOpen()).toBe(false);

    press('h');
    expect(isOpen()).toBe(true);

    press('h');
    expect(isOpen()).toBe(false);
    closeAndSettle();
  });

  it('closes the help on any other key, and that key still does its job', () => {
    render(<GlobalHotkeys bookId={bookId} />);
    press('h');
    press('c');

    expect(isOpen()).toBe(false);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/${bookId}/contents/`);
  });

  it('opens the help when another part of the page asks for it', () => {
    render(<GlobalHotkeys bookId={bookId} />);
    act(() => window.dispatchEvent(new CustomEvent('kirtan:showHelp')));

    expect(isOpen()).toBe(true);
  });

  it('ignores keys typed into a field', () => {
    render(
      <>
        <input aria-label="field" />
        <GlobalHotkeys bookId={bookId} />
      </>
    );
    screen.getByLabelText('field').focus();
    press('h');

    expect(isOpen()).toBe(false);
  });

  it('gives the focus to the page scroller, so arrow keys scroll it', () => {
    vi.useFakeTimers();
    render(
      <>
        <div className="Layout__content" tabIndex={-1} />
        <GlobalHotkeys bookId={bookId} />
      </>
    );
    act(() => vi.runAllTimers());

    expect(document.activeElement).toBe(document.querySelector('.Layout__content'));
  });

  it('leaves the focus where the page put it', () => {
    vi.useFakeTimers();
    render(
      <>
        <div className="Layout__content" tabIndex={-1} />
        <input aria-label="field" autoFocus />
        <GlobalHotkeys bookId={bookId} />
      </>
    );
    act(() => vi.runAllTimers());

    expect(document.activeElement).toBe(screen.getByLabelText('field'));
  });
});
