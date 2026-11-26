import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The tests read the real songbooks (.github/plans/2026-11-16_plan-tests.md, D4).
 * Stops the run with one message when they are not installed.
 */
export default function checkData(): void {
  const file = path.resolve(import.meta.dirname, '..', '..', 'source/books/songbooks.json');
  const hasBooks = existsSync(file) && Object.keys(JSON.parse(readFileSync(file, 'utf8'))).length > 0;

  if (!hasBooks) {
    throw new Error(
      'source/books/ is missing or empty. Run `pnpm run install:fetch` and `pnpm run install:post-fetch` first.'
    );
  }
}
