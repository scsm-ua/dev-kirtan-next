import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

// L7 runs against the test build of the real books (.github/plans/2026-11-16_plan-tests.md, D3).
const PORT = 3337; // Same origin as NEXT_PUBLIC_ORIGIN in env/.env.test.
const SITE_DIR = process.env.KIRTAN_BUILD_DIR || '.test-output/site';
const OUTPUT = '.test-output/playwright';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  outputDir: `${OUTPUT}/results`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: `${OUTPUT}/report`, open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Touch and a small screen: only the tests tagged @mobile.
    { name: 'webkit-iphone', use: { ...devices['iPhone 13'] }, grep: /@mobile/ }
  ],
  webServer: {
    // As GitHub Pages: `/x/` serves `x/index.html`, `/x` redirects to `/x/`, `.html` files are
    // served as they are (legacy redirects), 404.html for anything else.
    command: `node_modules/.bin/serve ${SITE_DIR} -p ${PORT} -L -n -c ${path.resolve('tests/setup/serve.json')}`,
    url: `http://localhost:${PORT}/sw.js`,
    // Never test against a server started with another build or config.
    reuseExistingServer: false
  }
});
