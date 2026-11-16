import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePageQuery } from '@/other/hooks/usePageQuery';
import { notifyLocationChange } from '@/other/router/location';

describe('usePageQuery', () => {
  it('gives the ?p= value of the URL', () => {
    window.history.replaceState(null, '', '/en/some-song/?p=20');

    expect(renderHook(() => usePageQuery()).result.current).toBe('20');
  });

  it('gives an empty string when the URL has no ?p=', () => {
    window.history.replaceState(null, '', '/en/some-song/');

    expect(renderHook(() => usePageQuery()).result.current).toBe('');
  });

  it('follows the URL', () => {
    window.history.replaceState(null, '', '/en/some-song/');
    const { result } = renderHook(() => usePageQuery());

    act(() => {
      window.history.pushState(null, '', '/en/some-song/?p=9');
      notifyLocationChange();
    });

    expect(result.current).toBe('9');
  });
});
