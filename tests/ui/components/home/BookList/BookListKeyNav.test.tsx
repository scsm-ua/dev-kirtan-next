import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BookListKeyNav from '@/components/home/BookList/BookListKeyNav';

const COLUMNS = 3;
const CARDS = 8; // rows: 0 1 2 / 3 4 5 / 6 7

function renderGrid({ withNav = true } = {}) {
  return render(
    <>
      {withNav && <BookListKeyNav />}
      <input aria-label="search" />
      <ul className="BookList__list">
        {Array.from({ length: CARDS }, (_, index) => (
          <li key={index}>
            <a href={`#book-${index}`}>book {index}</a>
          </li>
        ))}
      </ul>
    </>
  );
}

const focused = () => document.activeElement.textContent;

beforeEach(() => {
  const real = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) =>
    (el as Element).classList.contains('BookList__list')
      ? ({ gridTemplateColumns: Array(COLUMNS).fill('100px').join(' ') } as CSSStyleDeclaration)
      : real(el)
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BookListKeyNav', () => {
  it('lands on the first book on the first arrow press', async () => {
    renderGrid();
    await userEvent.keyboard('{ArrowDown}');

    expect(focused()).toBe('book 0');
  });

  it.each([
    ['{ArrowRight}', 1, 2],
    ['{ArrowLeft}', 1, 0],
    ['{ArrowLeft}', 0, 7],
    ['{ArrowRight}', 7, 0],
    ['{ArrowDown}', 1, 4],
    ['{ArrowDown}', 4, 7],
    ['{ArrowDown}', 5, 7],
    ['{ArrowDown}', 7, 0],
    ['{ArrowUp}', 4, 1],
    ['{ArrowUp}', 1, 7]
  ])('%s from book %i goes to book %i', async (key, from, to) => {
    const { getByText } = renderGrid();
    getByText(`book ${from}`).focus();
    await userEvent.keyboard(key);

    expect(focused()).toBe(`book ${to}`);
  });

  it('leaves arrow keys alone while typing in a field', async () => {
    const { getByRole } = renderGrid();
    getByRole('textbox').focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(document.activeElement).toBe(getByRole('textbox'));
  });

  it('ignores other keys', async () => {
    renderGrid();
    await userEvent.keyboard('{Enter}x');

    expect(document.activeElement).toBe(document.body);
  });

  it('stops listening after unmount', async () => {
    render(<BookListKeyNav />).unmount();
    renderGrid({ withNav: false });
    await userEvent.keyboard('{ArrowDown}');

    expect(document.activeElement).toBe(document.body);
  });
});
