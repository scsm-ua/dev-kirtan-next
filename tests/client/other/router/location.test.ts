import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { notifyLocationChange, useAppLocation } from '@/other/router/location';

describe('useAppLocation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/en/some-song/?p=2');
  });

  it('gives the path and the query of the current URL', () => {
    const { result } = renderHook(() => useAppLocation());

    expect(result.current.pathname).toBe('/en/some-song/');
    expect(result.current.search.get('p')).toBe('2');
  });

  it('follows a URL change that the app announces', () => {
    const { result } = renderHook(() => useAppLocation());

    act(() => {
      window.history.pushState(null, '', '/en/contents/');
      notifyLocationChange();
    });

    expect(result.current.pathname).toBe('/en/contents/');
    expect(result.current.search.get('p')).toBeNull();
  });

  it('follows back and forward', () => {
    const { result } = renderHook(() => useAppLocation());

    act(() => {
      window.history.replaceState(null, '', '/en/a-z/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.pathname).toBe('/en/a-z/');
  });

  it('keeps the same object while the URL stays the same', () => {
    const { result, rerender } = renderHook(() => useAppLocation());
    const first = result.current;

    rerender();
    act(() => notifyLocationChange());

    expect(result.current).toBe(first);
  });

  it('stops listening when unmounted', () => {
    const { result, unmount } = renderHook(() => useAppLocation());
    unmount();

    window.history.pushState(null, '', '/en/contents/');
    notifyLocationChange();

    expect(result.current.pathname).toBe('/en/some-song/');
  });
});
