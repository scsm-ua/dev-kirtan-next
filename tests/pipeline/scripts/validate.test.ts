import { afterEach, describe, expect, it, vi } from 'vitest';

import { validate } from '@/scripts/validate';

describe('validate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes on the installed songbooks and translations', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    validate();

    expect(exit).not.toHaveBeenCalled();
  });
});
