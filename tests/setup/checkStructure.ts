import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Stops the run when the tests folder rules are broken
 * (.github/plans/plan-tests.md, D9: F1, F2, F3, F6, F7).
 */

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const TESTS = 'tests';

const SOURCE_DIRS = ['app', 'components', 'lib', 'other', 'scripts', 'styles', 'types'];
// Layers whose nested test files mirror a source file path.
const MIRROR_LAYERS = ['pipeline', 'data', 'logic', 'client', 'ui'];
const VITEST_LAYERS = [...MIRROR_LAYERS, 'build'];
const PLAYWRIGHT_LAYER = 'e2e';
const KNOWN_DIRS = [...VITEST_LAYERS, PLAYWRIGHT_LAYER, 'helpers', 'setup'];

const ANY_TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const VITEST_FILE = /\.test\.tsx?$/;
const PLAYWRIGHT_FILE = /\.spec\.ts$/;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js'];

/**/
export default function checkStructure(): void {
  const errors = [
    ...findStrayTestFiles(),
    ...findUnknownEntries(),
    ...findMisplacedFiles()
  ];

  if (errors.length) {
    throw new Error(
      'Tests folder structure is broken (see D9 in .github/plans/plan-tests.md):\n' +
        errors.map((e) => `  - ${e}`).join('\n')
    );
  }
}

/** F1: test files live only under `tests/`. */
function findStrayTestFiles(): string[] {
  const rootFiles = readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);

  return [...rootFiles, ...SOURCE_DIRS.flatMap(listFiles)]
    .filter((file) => ANY_TEST_FILE.test(file))
    .map((file) => `${file}: test files belong in ${TESTS}/`);
}

/** F2: `tests/` holds only the known folders. */
function findUnknownEntries(): string[] {
  return readdirSync(path.join(ROOT, TESTS))
    .filter((name) => !name.startsWith('.') && !KNOWN_DIRS.includes(name))
    .map((name) => `${TESTS}/${name}: not one of ${KNOWN_DIRS.join(', ')}`);
}

/** F3, F6, F7: file names per layer, and mirrored tests have a source file. */
function findMisplacedFiles(): string[] {
  const errors: string[] = [];

  for (const layer of VITEST_LAYERS) {
    for (const file of listFiles(`${TESTS}/${layer}`)) {
      if (!VITEST_FILE.test(file)) {
        errors.push(`${file}: only *.test.ts(x) files here; shared code goes to ${TESTS}/helpers/`);
      } else if (MIRROR_LAYERS.includes(layer) && !hasSourceFile(layer, file)) {
        errors.push(`${file}: no source file with this path; rename it or move it to ${TESTS}/${layer}/`);
      }
    }
  }

  for (const file of listFiles(`${TESTS}/${PLAYWRIGHT_LAYER}`)) {
    if (!PLAYWRIGHT_FILE.test(file)) {
      errors.push(`${file}: only *.spec.ts files here; shared code goes to ${TESTS}/helpers/`);
    }
  }

  return errors;
}

/** Files directly in a layer folder are named after a behaviour and mirror nothing. */
function hasSourceFile(layer: string, file: string): boolean {
  const inner = path.relative(`${TESTS}/${layer}`, file);
  if (!inner.includes(path.sep)) return true;

  const base = inner.replace(VITEST_FILE, '');
  return SOURCE_EXTENSIONS.some((ext) => existsSync(path.join(ROOT, base + ext)));
}

/** Repo-relative paths of all files under `dir`, dot-files skipped. */
function listFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!existsSync(abs)) return [];

  return readdirSync(abs, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => path.relative(ROOT, path.join(e.parentPath, e.name)));
}
