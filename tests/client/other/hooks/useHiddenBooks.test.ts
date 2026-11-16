import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useHiddenBooks } from '@/other/hooks/useHiddenBooks';

describe('useHiddenBooks', () => {
  it('shows a book that is not hidden', () => {
    expect(renderHook(() => useHiddenBooks(false)).result.current).toBe(true);
  });

  it('does not show a hidden book', () => {
    expect(renderHook(() => useHiddenBooks(true)).result.current).toBe(false);
  });

  it('shows a hidden book to a user who turned hidden books on', () => {
    localStorage.setItem('SHOW_HIDDEN_BOOKS', '1');

    expect(renderHook(() => useHiddenBooks(true)).result.current).toBe(true);
  });
});
