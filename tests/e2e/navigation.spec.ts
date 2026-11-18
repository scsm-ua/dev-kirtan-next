import {
  allowErrors,
  expect,
  findPage,
  getNeighbours,
  markDocument,
  pathOf,
  test,
  waitForApp
} from '@/tests/helpers/e2e';

import type { Page } from '@playwright/test';

/**
 * Client navigation in a real browser: links and keys open pages from
 * `/data/` JSON without a document load; history, scroll and head follow.
 */

const scroller = (page: Page) => page.locator('.Layout__content');

test('other songbooks can be selected and appear first at their root', async ({ page }) => {
  await page.goto('/en/');
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await page.locator('main a[href="/en/other/"]').click();
  await expect(page).toHaveURL('/en/other/');
  await expect(page.locator('main .BookCard a[href="/en-pe/a-z/"]')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/en/');
  await page.goForward();
  await expect(page).toHaveURL('/en/other/');
  await page.locator('main .BookCard a[href="/en-pe/a-z/"]').click();
  await expect(page).toHaveURL('/en-pe/a-z/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('CURRENT_BOOK_ID'))).toBe('en-pe');
  await page.locator('a[href="/en-pe/"]').first().click();
  await expect(page).toHaveURL('/en-pe/');
  await expect(page.locator('main .BookCard a').first()).toHaveAttribute('href', '/en-pe/a-z/');
  expect(await isSameDocument()).toBe(true);
});

/** Data files the page requested, as paths. */
function recordDataRequests(page: Page): string[] {
  const paths: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/data/')) paths.push(pathname);
  });

  return paths;
}

test('a link opens the page from its data file, without a document load, and updates the head', async ({ page }) => {
  const contents = findPage('contents', 'contents with a song');
  const song = findPage('song', 'a song of that book', (candidate) => candidate.route.bookId === contents.route.bookId);
  const dataRequests = recordDataRequests(page);

  await page.goto(pathOf(contents));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await page.locator(`main a[href="${pathOf(song)}"]`).first().click();

  await expect(page).toHaveURL(pathOf(song));
  await expect(page.locator('h1')).toContainText(song.data.song.title[0].trim());
  await expect(page).toHaveTitle(song.head.title);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new URL(pathOf(song), page.url()).href);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', song.head.description);
  expect(dataRequests).toContain(`/data/${song.route.bookId}/${song.route.slug}.json`);
  expect(await isSameDocument()).toBe(true);
});

test('the language of the document follows the book, as in its static HTML', async ({ page, request }) => {
  const start = findPage('book-list', 'any book');

  await page.goto(pathOf(start));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);
  const startLang = await page.locator('html').getAttribute('lang');

  // A linked page of another book whose static HTML has another language.
  let target: { href: string; lang: string } | undefined;
  for (const href of await page.locator('main a[href]').evaluateAll((links) => links.map((a) => a.getAttribute('href')))) {
    if (!href.startsWith('/') || href.startsWith(`/${start.route.bookId}/`)) continue;
    const lang = /<html lang="([^"]+)"/.exec(await (await request.get(href)).text())?.[1];
    if (lang && lang !== startLang) {
      target = { href, lang };
      break;
    }
  }
  expect(target, 'a linked book in another language').toBeDefined();

  await page.locator(`main a[href="${target.href}"]`).first().click();

  await expect(page).toHaveURL(target.href);
  await expect(page.locator('html')).toHaveAttribute('lang', target.lang);
  expect(await isSameDocument()).toBe(true);
});

test('back and forward restore the pages and the scroll position of each', async ({ page }) => {
  const contents = findPage('contents', 'a long contents page', (candidate) =>
    candidate.data.groups.flatMap((group) => group.items).length > 60
  );

  await page.goto(pathOf(contents));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await scroller(page).evaluate((el) => (el.scrollTop = 1200));
  // A song link that is on screen at this scroll position.
  const link = page.locator('main a[href]').filter({ visible: true });
  const href = await page.evaluate(() => {
    const anchors = [...document.querySelectorAll<HTMLAnchorElement>('main a[href]')];
    return anchors.find((a) => {
      const { top, bottom } = a.getBoundingClientRect();
      return top > 100 && bottom < window.innerHeight - 100 && /^\/[\w-]+\/[\w-]+\/$/.test(a.getAttribute('href'));
    })?.getAttribute('href');
  });
  await link.and(page.locator(`[href="${href}"]`)).first().click();
  await expect(page).toHaveURL(href);
  await expect(scroller(page)).toHaveJSProperty('scrollTop', 0);

  await page.goBack();
  await expect(page).toHaveURL(pathOf(contents));
  await expect.poll(() => scroller(page).evaluate((el) => el.scrollTop)).toBe(1200);

  await page.goForward();
  await expect(page).toHaveURL(href);
  await expect.poll(() => scroller(page).evaluate((el) => el.scrollTop)).toBe(0);
  expect(await isSameDocument()).toBe(true);
});

test('arrow keys open the next and the previous song', async ({ page }) => {
  const song = findPage('song', 'a song with a previous and a next song', (candidate) => {
    const { prev, next } = getNeighbours(candidate);
    return !!prev && !!next;
  });
  const { next } = getNeighbours(song);

  await page.goto(pathOf(song));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(new URL(next.path, page.url()).pathname);

  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(pathOf(song));
  expect(await isSameDocument()).toBe(true);
});

test('letter keys open the contents and the index of the book', async ({ page }) => {
  const song = findPage('song', 'any song');
  const { bookId } = song.route;

  await page.goto(pathOf(song));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await page.keyboard.press('c');
  await expect(page).toHaveURL(`/${bookId}/contents/`);
  await page.keyboard.press('i');
  await expect(page).toHaveURL(`/${bookId}/a-z/`);
  expect(await isSameDocument()).toBe(true);
});

test('a key to a page outside the app (export) loads it as a new document', async ({ page }) => {
  const contents = findPage('contents', 'any book');

  await page.goto(pathOf(contents));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await page.keyboard.press('e');

  await expect(page).toHaveURL(`/${contents.route.bookId}/export/`);
  await expect(page.locator('h1').first()).toBeVisible();
  expect(await isSameDocument()).toBe(false);
});

test('h opens and closes the list of keys', async ({ page }) => {
  const contents = findPage('contents', 'any book');

  await page.goto(pathOf(contents));
  await waitForApp(page);

  await page.keyboard.press('h');
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('h');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test.describe('falls back to a document load', () => {
  test('when the data file is from another build (a new deploy)', async ({ page }) => {
    const contents = findPage('contents', 'contents with a song');
    const song = findPage('song', 'a song of that book', (candidate) => candidate.route.bookId === contents.route.bookId);

    // On the context: data requests may go through the service worker.
    await page.context().route(`**/data/${song.route.bookId}/${song.route.slug}.json`, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...(await response.json()), build: 'another-build' } });
    });
    await page.goto(pathOf(contents));
    await waitForApp(page);
    const isSameDocument = await markDocument(page);

    await page.locator(`main a[href="${pathOf(song)}"]`).first().click();

    await expect(page).toHaveURL(pathOf(song));
    await expect(page.locator('h1')).toContainText(song.data.song.title[0].trim());
    expect(await isSameDocument()).toBe(false);
  });

  test('when the data file is missing', async ({ page }) => {
    allowErrors(/Failed to load resource.*404/);
    const contents = findPage('contents', 'contents with a song');
    const song = findPage('song', 'a song of that book', (candidate) => candidate.route.bookId === contents.route.bookId);

    await page.context().route(`**/data/${song.route.bookId}/${song.route.slug}.json`, (route) => route.fulfill({ status: 404 }));
    await page.goto(pathOf(contents));
    await waitForApp(page);
    const isSameDocument = await markDocument(page);

    await page.locator(`main a[href="${pathOf(song)}"]`).first().click();

    await expect(page).toHaveURL(pathOf(song));
    await expect(page.locator('h1')).toContainText(song.data.song.title[0].trim());
    expect(await isSameDocument()).toBe(false);
  });
});

test.describe('addresses outside the app', () => {
  test('an old .html address redirects to the page of the song', async ({ page }) => {
    const song = findPage('song', 'any song');

    await page.goto(`/${song.route.bookId}/${song.route.slug}.html`);

    await expect(page).toHaveURL(pathOf(song));
    await expect(page.locator('h1')).toContainText(song.data.song.title[0].trim());
  });

  test('an unknown address shows the 404 page', async ({ page }) => {
    allowErrors(/Failed to load resource.*404/);
    const { bookId } = findPage('contents', 'any book').route;

    const response = await page.goto(`/${bookId}/no-such-page/`);

    expect(response.status()).toBe(404);
    await expect(page.locator('.NotFoundPage__list a').first()).toBeVisible();
  });
});
