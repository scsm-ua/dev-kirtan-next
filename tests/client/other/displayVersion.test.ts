import { afterEach, describe, expect, it, vi } from 'vitest';

import { displayVersionInfo } from '@/other/displayVersion';

describe('displayVersionInfo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('does not print test build info', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    displayVersionInfo();

    expect(log).not.toHaveBeenCalled();
  });

  it('prints the build info outside tests', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    displayVersionInfo();

    const printed = log.mock.calls.map((args) => String(args[0])).join('\n');
    expect(printed).toContain('Kirtan Site');
    expect(JSON.parse(String(log.mock.calls[1][0]))).toEqual(__BUILD_INFO__);
  });
});
