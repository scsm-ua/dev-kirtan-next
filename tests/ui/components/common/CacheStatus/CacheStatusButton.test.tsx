import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translate } from '@/other/i18n';

import type { TCacheStatusState } from '@/other/offline/cacheStatus';

let state: TCacheStatusState;
let notify: () => void;

vi.mock('@/other/offline/cacheStatus', () => ({
  getBookCacheInfo: () => new Promise(() => {}),
  getCacheStatus: () => state,
  subscribeCacheStatus: (listener: () => void) => {
    notify = listener;
    return () => {};
  }
}));

const { default: CacheStatusButton } = await import('@/components/common/CacheStatus/CacheStatusButton');

beforeEach(() => {
  state = { isAvailable: true, books: {} };
});

describe('CacheStatusButton', () => {
  it('is not rendered without a service worker', () => {
    state = { isAvailable: false, books: {} };
    const { container } = render(<CacheStatusButton bookId="en" />);

    expect(container.innerHTML).toBe('');
  });

  it('shows the dot of its book and names the state; follows the store', () => {
    state = { isAvailable: true, books: { ru: { bookId: 'ru', pages: true, state: 'cached' } } };
    render(<CacheStatusButton bookId="en" />);
    const button = screen.getByRole('button', { name: translate('en', 'OFFLINE.NOT_SAVED') });

    expect(button.getAttribute('data-book')).toBe('en');
    expect(button.querySelector('.CacheLed').getAttribute('data-status')).toBe('none');

    act(() => {
      state = { isAvailable: true, books: { en: { bookId: 'en', pages: true, state: 'cached' } } };
      notify();
    });

    expect(screen.getByRole('button', { name: translate('en', 'OFFLINE.AVAILABLE') })).toBe(button);
    expect(button.querySelector('.CacheLed').getAttribute('data-status')).toBe('cached');
  });

  it('opens the popup on click', () => {
    render(<CacheStatusButton bookId="en" />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog').querySelector('.CacheStatusModal')).not.toBeNull();
  });
});
