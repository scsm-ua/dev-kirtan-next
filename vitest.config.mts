import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

import { defineConfig } from 'vitest/config';

// Folder rules and layers: .github/plans/2026-11-16_plan-tests.md (D7, D9).
const root = import.meta.dirname;
const testEnv = parseEnv(readFileSync(path.join(root, 'env/.env.test'), 'utf8'));

// L6 checks the build it is pointed at (e.g. `out/` with the production env in deploy).
const buildEnv = Object.fromEntries(
  Object.entries(testEnv).map(([key, value]) => [key, process.env[key] ?? value])
);

export default defineConfig({
  resolve: {
    alias: { '@': root }
  },
  define: {
    __BOOK_IDS__: JSON.stringify(
      Object.keys(JSON.parse(readFileSync(path.join(root, 'source/books/songbooks.json'), 'utf8')))
    ),
    __BUILD_INFO__: JSON.stringify({
      branch: 'test',
      commit: 'test',
      builtTime: 'test',
      version: '0.0.0'
    })
  },
  test: {
    env: {
      ...testEnv,
      TZ: 'UTC'
    },
    globalSetup: ['tests/setup/checkStructure.ts', 'tests/setup/checkData.ts'],
    // Sweeps load whole books in beforeAll: slower with coverage and on CI runners.
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: '.test-output/coverage',
      include: ['{app,components,lib,other,scripts}/**/*.{ts,tsx,js}'],
      // Levels reached on 2026-11-16 minus 1 point (some branches depend on book content); only raise.
      thresholds: {
        statements: 88,
        branches: 87,
        functions: 90,
        lines: 88,
        'components/**': { statements: 95, branches: 92, functions: 95, lines: 96 },
        'lib/**': { statements: 97, branches: 88, functions: 99, lines: 98 },
        'other/**': { statements: 95, branches: 90, functions: 95, lines: 96 },
        'scripts/**': { statements: 62, branches: 70, functions: 73, lines: 61 }
      }
    },
    // The folder decides the environment; never list single files here.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/{pipeline,data,logic}/**/*.test.{ts,tsx}']
        }
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          // Same origin as NEXT_PUBLIC_ORIGIN in env/.env.test.
          environmentOptions: { jsdom: { url: 'http://localhost:3337/' } },
          setupFiles: ['tests/setup/dom.ts'],
          include: ['tests/{client,ui}/**/*.test.{ts,tsx}']
        }
      },
      {
        extends: true,
        test: {
          name: 'build',
          environment: 'node',
          env: buildEnv,
          setupFiles: ['tests/setup/build.ts'],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          include: ['tests/build/**/*.test.ts']
        }
      }
    ]
  }
});
