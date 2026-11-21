import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isServiceWorkerEnabled } from '@/other/offline/serviceWorkerEnabled';

describe('isServiceWorkerEnabled', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} });
    vi.stubEnv('NEXT_PUBLIC_PREVENT_SERVICE_WORKER', '');
  });

  afterEach(() => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    vi.unstubAllEnvs();
  });

  it('is on in a browser with service workers', () => {
    expect(isServiceWorkerEnabled()).toBe(true);
  });

  it('is off in a browser without service workers', () => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    expect(isServiceWorkerEnabled()).toBe(false);
  });

  it('is on in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isServiceWorkerEnabled()).toBe(true);
  });

  it('is off when the env prevents the worker', () => {
    vi.stubEnv('NEXT_PUBLIC_PREVENT_SERVICE_WORKER', 'true');
    expect(isServiceWorkerEnabled()).toBe(false);
  });
});
