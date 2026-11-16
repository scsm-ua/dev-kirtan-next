import { afterEach, describe, expect, it, vi } from 'vitest';

/** `ROBOTS` is computed when the module loads, so every test imports it afresh. */
async function loadRobots(env: string) {
  vi.stubEnv('NEXT_PUBLIC_ENV', env);
  vi.resetModules();

  return (await import('@/other/metadata/helpers/constants')).ROBOTS;
}

describe('ROBOTS', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('lets search engines index the production site', async () => {
    const robots = await loadRobots('production');

    expect(robots).toMatchObject({ index: true, follow: true, googleBot: { index: true, follow: true } });
  });

  it.each(['test', 'development', ''])('keeps search engines away from the "%s" site', async (env) => {
    const robots = await loadRobots(env);

    expect(robots).toMatchObject({ index: false, follow: false, googleBot: { index: false, follow: false } });
  });
});
