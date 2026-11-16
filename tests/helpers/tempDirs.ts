import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach } from 'vitest';

/**
 * Call inside a test file or `describe`. Returns a function that makes a new
 * empty folder in the OS temp dir; the folders are removed after each test.
 */
export function useTempDirs(): () => string {
  const dirs: string[] = [];

  afterEach(() => {
    dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });

  return () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'kirtan-test-'));
    dirs.push(dir);
    return dir;
  };
}
