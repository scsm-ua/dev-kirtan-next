import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useServiceWorker } from '@/other/hooks/useServiceWorker';
import { getBuildId } from '@/other/router/buildId';

/** jsdom has no service worker: give `navigator` one whose `register` is a mock. */
function stubServiceWorker(register: () => Promise<unknown>) {
  const mock = vi.fn(register);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: mock } });
  return mock;
}

describe('useServiceWorker', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('registers the worker for the whole site, with the build id in its URL', () => {
    const register = stubServiceWorker(async () => ({ scope: '/' }));

    renderHook(() => useServiceWorker());

    expect(register).toHaveBeenCalledExactlyOnceWith(`/sw.js?v=${encodeURIComponent(getBuildId())}`, {
      scope: '/'
    });
  });

  it('reports a failed registration', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    stubServiceWorker(async () => {
      throw new Error('Registration failed');
    });

    renderHook(() => useServiceWorker());

    await waitFor(() => expect(error).toHaveBeenCalledOnce());
  });

  it('does nothing in a browser without service workers', () => {
    expect(() => renderHook(() => useServiceWorker())).not.toThrow();
  });

  it('does not register when the environment turns the worker off', async () => {
    const register = stubServiceWorker(async () => ({ scope: '/' }));
    vi.stubEnv('NEXT_PUBLIC_PREVENT_SERVICE_WORKER', 'true');
    vi.resetModules();
    // Fresh copies of React Testing Library and the hook, so both use the same React.
    const rtl = await import('@testing-library/react');
    const fresh = await import('@/other/hooks/useServiceWorker');

    rtl.renderHook(() => fresh.useServiceWorker());
    rtl.cleanup();

    expect(register).not.toHaveBeenCalled();
  });
});
