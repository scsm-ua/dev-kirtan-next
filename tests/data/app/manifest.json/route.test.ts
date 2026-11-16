import { existsSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/manifest.json/route';
import { ROOT } from '@/tests/helpers/books';

describe('manifest.json', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('describes an installable app that starts at the site root', async () => {
    const manifest = await (await GET()).json();

    expect(manifest).toMatchObject({ display: 'standalone', scope: '/', start_url: '/' });
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
  });

  it('lists icons that exist in public/', async () => {
    const { icons } = await (await GET()).json();
    const missing = icons.filter(({ src }) => !existsSync(path.join(ROOT, 'public', src)));

    expect(icons.length).toBeGreaterThan(0);
    expect(missing.map(({ src }) => src)).toEqual([]);
  });

  it('marks the app name outside production', async () => {
    const development = await (await GET()).json();

    vi.stubEnv('NEXT_PUBLIC_ENV', 'production');
    const production = await (await GET()).json();

    expect(production.name).not.toBe(development.name);
    expect(development.name).toContain(production.name);
  });
});
