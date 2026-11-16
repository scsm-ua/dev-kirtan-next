import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsOnline } from '@/other/hooks/useIsOnline';

describe('useIsOnline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts online, goes offline when the probe fails and comes back when it works', async () => {
    const fetchMock = vi.fn(async (): Promise<Response> => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);
    await waitFor(() => expect(result.current).toBe(false));

    fetchMock.mockImplementation(async () => new Response(''));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(result.current).toBe(true));
  });
});
