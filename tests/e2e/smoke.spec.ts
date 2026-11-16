import { expect, findPage, pathOf, test, waitForApp } from '@/tests/helpers/e2e';

import type { TPageKind } from '@/types/pageData';

/**
 * Every kind of page opens as a first visit and hydrates without errors
 * (a hydration mismatch is a console error, which fails the test).
 */

const KINDS: TPageKind[] = ['book-list', 'contents', 'a-z', 'authors', 'search', 'audio', 'audio-singer', 'song', 'page'];

test.describe('first visit @mobile', () => {
  for (const kind of KINDS) {
    test(`a ${kind} page`, async ({ page }) => {
      const data = findPage(kind, `any ${kind} page`);

      await page.goto(pathOf(data));
      await waitForApp(page);

      await expect(page).toHaveTitle(data.head.title);
      await expect(page.locator('main')).not.toBeEmpty();
    });
  }

  test('the home page sends the visitor to a songbook', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/[\w-]+\/$/);
    await waitForApp(page);
  });
});

test.describe('full-load pages', () => {
  test('analyze and export open', async ({ page }) => {
    const { bookId } = findPage('contents', 'any book').route;

    await page.goto(`/${bookId}/analyze/`);
    await expect(page.locator('table')).toBeVisible();

    await page.goto(`/${bookId}/export/`);
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
