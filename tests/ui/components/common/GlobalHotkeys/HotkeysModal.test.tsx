import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HotkeysModal from '@/components/common/GlobalHotkeys/HotkeysModal';
import { translate } from '@/other/i18n';
import { getBookIds } from '@/tests/helpers/books';

/** Every key the hotkey hook handles (other/hooks/useGlobalHotkeys.ts). */
const HANDLED_KEYS = ['h', 'b', 'c', 'i', 's', 'e', 'a', 'Shift+A', 'l', '←', '→', '1', '2', '3', '4', '5', '6'];

describe('HotkeysModal', () => {
  it('lists every hotkey with its description', () => {
    render(<HotkeysModal bookId={getBookIds()[0]} isOpen onClose={() => {}} />);
    const keys = [...document.querySelectorAll('.HotkeysModal kbd')].map((kbd) => kbd.textContent);
    const descriptions = [...document.querySelectorAll('.HotkeysModal__desc')].map((dd) => dd.textContent);

    expect(screen.getByRole('dialog').querySelector('.AppModal__title').textContent).toBe('Keyboard shortcuts');
    expect([...keys].sort()).toEqual([...HANDLED_KEYS].sort());
    expect(descriptions.every(Boolean)).toBe(true);
  });

  it.each(getBookIds())('describes the hotkeys in the language of the book: %s', (bookId) => {
    render(<HotkeysModal bookId={bookId} isOpen onClose={() => {}} />);
    const descriptions = [...document.querySelectorAll('.HotkeysModal__desc')].map((dd) => dd.textContent);

    expect(descriptions).toContain(translate(bookId, 'FOOTER.CONTENTS'));
    expect(descriptions).toContain(translate(bookId, 'SONG_PAGE.NEXT_SONG'));
  });

  it('is not shown while closed', () => {
    render(<HotkeysModal bookId={getBookIds()[0]} isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on its close button', () => {
    const onClose = vi.fn();
    render(<HotkeysModal bookId={getBookIds()[0]} isOpen onClose={onClose} />);
    fireEvent.click(document.querySelector('.AppModal__button'));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
