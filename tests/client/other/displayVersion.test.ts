import { afterEach, describe, expect, it, vi } from 'vitest';

import { displayVersionInfo } from '@/other/displayVersion';

describe('displayVersionInfo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints the build info to the console', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    displayVersionInfo();

    const printed = log.mock.calls.map((args) => String(args[0])).join('\n');
    expect(printed).toContain('Kirtan Site');
    expect(JSON.parse(String(log.mock.calls[1][0]))).toEqual(__BUILD_INFO__);
  });
});
