import { allowErrors, expect, test, waitForApp, waitForBookCached, waitForWorker } from '@/tests/helpers/e2e';

import type { Page } from '@playwright/test';

/**
 * The root page `/` is the songbook list of the first songbook. The app moves
 * the reader to their own songbook in place, with no second document load.
 */

/** `PREFERRED_BOOK_KEY` of `other/constants.ts`; that module needs the env of the build. */
const PREFERRED_BOOK_KEY = 'CURRENT_BOOK_ID';

/** Paths of the documents the page loads. */
function recordDocuments(page: Page): string[] {
  const paths: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) {
      paths.push(new URL(request.url()).pathname);
    }
  });
  return paths;
}

/** The reader chose this songbook on an earlier visit. */
const preferBook = (page: Page, bookId: string) =>
  page.addInitScript(([key, value]) => localStorage.setItem(key, value), [PREFERRED_BOOK_KEY, bookId]);

const cardOf = (page: Page, bookId: string) => page.locator(`main .BookCard a[href="/${bookId}/a-z/"]`);

test('with no preference the root page becomes the first songbook, with no second document', async ({ page }) => {
  const documents = recordDocuments(page);
  await page.goto('/');
  await waitForApp(page);

  await expect(page).toHaveURL('/en/');
  await expect(cardOf(page, 'en')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-root-pending');
  expect(documents).toEqual(['/']);

  // The root entry was replaced: back leaves the site, it does not return to `/`.
  expect(await page.evaluate(() => history.length)).toBe(2);
});

test('the root page opens the songbook the reader chose before, with no second document', async ({ page }) => {
  await preferBook(page, 'ru');
  const documents = recordDocuments(page);
  await page.goto('/');
  await waitForApp(page);

  await expect(page).toHaveURL('/ru/');
  await expect(page.locator('main h1, main .BookList')).not.toHaveCount(0);
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('html')).not.toHaveAttribute('data-root-pending');
  await expect(page.locator('.Layout')).toBeVisible();
  expect(documents).toEqual(['/']);

  // It is the songbook list of `ru`: its links stay in that book.
  await page.keyboard.press('c');
  await expect(page).toHaveURL('/ru/contents/');
});

test.describe('in a browser of another language', () => {
  test.use({ locale: 'lv-LV' });

  test('the root page opens the songbook in the language of the browser', async ({ page }) => {
    const documents = recordDocuments(page);
    await page.goto('/');
    await waitForApp(page);

    await expect(page).toHaveURL('/lv/');
    expect(documents).toEqual(['/']);
  });
});

test('offline, the root page opens the cached songbook the reader chose', async ({ page, context }) => {
  allowErrors(/Failed to load resource/);
  await page.goto('/ru/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'ru');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [PREFERRED_BOOK_KEY, 'ru']);

  await context.setOffline(true);
  await page.goto('/');

  await expect(page).toHaveURL('/ru/');
  await expect(cardOf(page, 'ru')).toBeVisible();
});

test('offline, the root page falls back to the first songbook when the chosen one is not cached', async ({
  page,
  context
}) => {
  allowErrors(/Failed to load resource/);
  await page.goto('/en/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'en');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [PREFERRED_BOOK_KEY, 'ru']);

  await context.setOffline(true);
  await page.goto('/');

  await expect(page).toHaveURL('/en/');
  await expect(cardOf(page, 'en')).toBeVisible();
});

test('offline, the root page says it is offline when no songbook is cached', async ({ page, context }) => {
  allowErrors(/Failed to load resource/);
  // The songbook list starts no book job: only the shell is cached.
  await page.goto('/en/');
  await waitForApp(page);
  await waitForWorker(page);

  await context.setOffline(true);
  await page.goto('/');

  await expect(page.locator('.AppRoot__offline')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-root-pending');
});
