import { allowErrors, expect, findPage, pathOf, test, waitForApp } from '@/tests/helpers/e2e';

/**
 * The service worker (`public/sw.js`) caches a whole book after the first
 * visit; the book then works offline, also for pages never opened before.
 */

test.beforeEach(() => {
  // Requests the service worker cannot answer from its cache, e.g. the connectivity probe.
  allowErrors(/Failed to load resource/);
});

test('other songbooks are available offline after precaching the current book', async ({ page, context }) => {
  await page.goto('/en/');
  await waitForApp(page);
  await page.waitForFunction(() => !!localStorage.getItem('kirtan:precached:en'), null, { timeout: 20_000 });
  await context.setOffline(true);

  await page.locator('main a[href="/en/other/"]').click();
  await expect(page).toHaveURL('/en/other/');
  await expect(page.locator('main .BookCard a[href="/en-pe/a-z/"]')).toBeVisible();
});

test('a visited book keeps working offline, also on pages that were never opened', async ({ page, context }) => {
  const song = findPage('song', 'a song with another song in its book');
  const { bookId } = song.route;
  const other = findPage('song', 'another song of that book', (candidate) =>
    candidate.route.bookId === bookId && candidate.route.slug !== song.route.slug
  );

  await page.goto(pathOf(song));
  await waitForApp(page);
  await page.waitForFunction((marker) => !!localStorage.getItem(marker), `kirtan:precached:${bookId}`, { timeout: 20_000 });

  await context.setOffline(true);

  // Client navigation: the data comes from the cache.
  await page.keyboard.press('c');
  await expect(page).toHaveURL(`/${bookId}/contents/`);
  await expect(page.locator('main.Main')).not.toBeEmpty();

  // A document load of a page never opened: the cached shell renders it from cached data.
  await page.goto(pathOf(other));
  await expect(page).toHaveURL(pathOf(other));
  await expect(page.locator('h1')).toContainText(other.data.song.title[0].trim());
  await expect(page).toHaveTitle(other.head.title);
  // The shell has no server-only extras: no JSON-LD.
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test('a book that was not cached says it is offline', async ({ page, context }) => {
  const song = findPage('song', 'any song');
  const otherBook = findPage('contents', 'another book', (candidate) => candidate.route.bookId !== song.route.bookId);

  await page.goto(pathOf(song));
  await waitForApp(page);
  await page.waitForFunction((marker) => !!localStorage.getItem(marker), `kirtan:precached:${song.route.bookId}`, {
    timeout: 20_000
  });

  await context.setOffline(true);
  await page.goto(pathOf(otherBook));

  await expect(page).toHaveURL(pathOf(otherBook));
  await expect(page.locator('.AppRoot__offline h1')).toHaveText("You're offline");
});

// A new build cannot reach an offline reader (each build has its own cache), so the
// document-load fallback offline only happens for data that is not cached.
test('offline, a link to a book that was not cached ends at the offline note once; Go back returns', async ({
  page,
  context
}) => {
  const song = findPage('song', 'any song');
  const { bookId } = song.route;

  await page.goto(pathOf(song));
  await waitForApp(page);
  await page.waitForFunction((marker) => !!localStorage.getItem(marker), `kirtan:precached:${bookId}`, {
    timeout: 20_000
  });
  await context.setOffline(true);

  await page.keyboard.press('b');
  await expect(page).toHaveURL(`/${bookId}/`);
  const href = await page
    .locator('main a[href^="/"]')
    .evaluateAll((links, own) => links.map((a) => a.getAttribute('href')).find((value) => !value.startsWith(own)), `/${bookId}/`);
  expect(href, 'a link to another book').toBeDefined();

  const documentLoads: string[] = [];
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentLoads.push(request.url());
  });
  await page.locator(`main a[href="${href}"]`).first().click();

  await expect(page).toHaveURL(href);
  await expect(page.locator('.AppRoot__offline h1')).toHaveText("You're offline");
  // Give a reload loop the time to show itself.
  await page.waitForTimeout(1000);
  expect(documentLoads).toEqual([new URL(href, page.url()).href]);

  await page.locator('.AppRoot__offline button').click();
  await expect(page).toHaveURL(`/${bookId}/`);
  await expect(page.locator('main a[href]').first()).toBeVisible();
});
