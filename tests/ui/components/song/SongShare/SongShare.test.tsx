import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import SongShare from '@/components/song/SongShare/SongShare';
import { loadPageData } from '@/lib/pageData';
import { translate } from '@/other/i18n';
import { getBookIds, getSongItems } from '@/tests/helpers/books';

let bookId: string;
let telegraphUrl: string;

beforeAll(async () => {
  for (const id of getBookIds()) {
    for (const { id: slug } of getSongItems(id)) {
      const page = await loadPageData({ kind: 'item', bookId: id, slug });
      if (page?.kind === 'song' && page.data.telegraphUrl) {
        bookId = id;
        telegraphUrl = page.data.telegraphUrl;
        return;
      }
    }
  }
  throw new Error('No real song has a Telegraph page.');
});

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  window.history.replaceState(null, '', `/${bookId}/some-song/?p=5`);
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'clipboard');
});

const t = (key: string) => translate(bookId, `SONG_PAGE.${key}`);
const inputs = () => [...document.querySelectorAll<HTMLInputElement>('.SongShare__input')];
const copyButtons = () => screen.getAllByTitle(t('COPY'));

async function open(url: string | null = telegraphUrl) {
  render(<SongShare bookId={bookId} telegraphUrl={url} />);
  fireEvent.click(screen.getByTitle(t('SHARE_SONG')));
  await waitFor(() => expect(inputs().length).toBeGreaterThan(0));
}

describe('SongShare', () => {
  it('is a share button; nothing else until it is pressed', () => {
    render(<SongShare bookId={bookId} telegraphUrl={telegraphUrl} />);

    expect(screen.getByTitle(t('SHARE_SONG')).tagName).toBe('BUTTON');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the address of the page as a QR code and as text, and the Telegraph page', async () => {
    await open();

    expect(screen.getByRole('dialog').querySelector('.AppModal__title').textContent).toBe(t('SHARE'));
    expect(document.querySelector('.SongShare__qr svg')).toBeTruthy();
    expect(inputs().map((input) => input.value)).toEqual([window.location.href, telegraphUrl]);
    expect(inputs().every((input) => input.readOnly)).toBe(true);
  });

  it('has no Telegraph part for a song without a Telegraph page', async () => {
    await open(null);

    expect(inputs().map((input) => input.value)).toEqual([window.location.href]);
    expect(copyButtons()).toHaveLength(1);
  });

  it.each([
    ['the address', 0],
    ['the Telegraph link', 1]
  ])('copies %s and closes', async (_, index) => {
    await open();
    vi.useFakeTimers();
    fireEvent.click(copyButtons()[index]);

    expect(writeText).toHaveBeenCalledExactlyOnceWith(inputs()[index].value);
    expect(screen.getByRole('dialog').getAttribute('style')).not.toContain('modal-out');
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole('dialog').getAttribute('style')).toContain('modal-out');
  });

  it('selects the whole text on a click in a field', async () => {
    await open();
    const [input] = inputs();
    fireEvent.click(input);

    expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length]);
  });

  it('reports a failed copy and still closes', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeText.mockRejectedValue(new Error('denied'));
    await open();
    fireEvent.click(copyButtons()[0]);

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('dialog').getAttribute('style')).toContain('modal-out'));
    consoleError.mockRestore();
  });
});
