import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('other page metadata', () => {
  it('allows search engines to index the production page', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', 'production');
    vi.resetModules();

    const { getOtherPageMeta } = await import('@/other/metadata/getOtherPageMeta');
    const meta = await getOtherPageMeta({ params: Promise.resolve({ bookId: 'en' }) });

    expect(meta.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: { index: true, follow: true }
    });
  });
});
