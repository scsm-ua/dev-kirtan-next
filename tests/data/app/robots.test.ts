import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from '@/app/robots';

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN;

describe('robots', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('closes the whole site outside production', () => {
    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' });
  });

  it('opens the production site, except search results and app data', () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', 'production');

    expect(robots().rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/*/search/', '/data/', '/shell/']
    });
  });

  it('points to the sitemap of this site', () => {
    expect(robots().sitemap).toBe(`${ORIGIN}sitemap.xml`);
  });
});
