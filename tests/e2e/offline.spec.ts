import {
  allowErrors,
  dataUrlOf,
  deleteCached,
  ensureBookNow,
  expect,
  findPage,
  getBookBundle,
  getBookCacheInfo,
  getSharedImages,
  getBookCacheStatus,
  getBookJobFiles,
  getNeighbours,
  getStatusRecord,
  listCachedPaths,
  pathOf,
  recordRequests,
  test,
  waitForApp,
  waitForBookCached,
  waitForWorker
} from '@/tests/helpers/e2e';

import type { Page } from '@playwright/test';
import type { TBookCacheRecord, TSharedCacheRecord } from '@/types/offline';

/**
 * The service worker (`public/sw.js`) caches a whole book after the first
 * visit; the book then works offline, also for pages never opened before.
 */

test.beforeEach(() => {
  // Requests the service worker cannot answer from its cache, e.g. the connectivity probe.
  allowErrors(/Failed to load resource/);
});

test('offline, the other songbooks page shows the books that were not cached greyed out, without links', async ({
  page,
  context
}) => {
  // Not the songbook list: it starts no book job.
  await page.goto('/en/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'en');
  await context.setOffline(true);

  await page.keyboard.press('b');
  await expect(page).toHaveURL('/en/');
  await page.locator('main a[href="/en/other/"]').click();
  await expect(page).toHaveURL('/en/other/');
  const card = page.locator('main .BookCard:has(img[src*="banner-en-pe."])');
  await expect(card).toBeVisible();
  await expect(card).toHaveClass(/BookCard--disabled/);
  await expect(card.locator('a')).toHaveCount(0);
});

test('a visited book keeps working offline, also on pages that were never opened', async ({ page, context }) => {
  const song = findPage('song', 'a song with another song in its book');
  const { bookId } = song.route;
  const other = findPage('song', 'another song of that book', (candidate) =>
    candidate.route.bookId === bookId && candidate.route.slug !== song.route.slug
  );

  await page.goto(pathOf(song));
  await waitForApp(page);
  await waitForBookCached(page, bookId);

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

test('offline, a page URL without the trailing slash is redirected to the one with it', async ({ page, context }) => {
  const song = findPage('song', 'a song with another song in its book');
  const { bookId } = song.route;
  const other = findPage('song', 'another song of that book', (candidate) =>
    candidate.route.bookId === bookId && candidate.route.slug !== song.route.slug
  );
  const withoutSlash = (path: string) => path.replace(/\/$/, '');

  await page.goto(pathOf(song));
  await waitForApp(page);
  await waitForBookCached(page, bookId);
  await context.setOffline(true);

  // A page never opened: without the redirect the shell would not take the URL for an app page.
  await page.goto(`${withoutSlash(pathOf(other))}?from=bookmark#top`);
  await expect(page).toHaveURL(`${pathOf(other)}?from=bookmark#top`);
  await expect(page.locator('h1')).toContainText(other.data.song.title[0].trim());

  // A page with cached HTML.
  await page.goto(withoutSlash(pathOf(song)));
  await expect(page).toHaveURL(pathOf(song));
  await expect(page.locator('h1')).toContainText(song.data.song.title[0].trim());
});

test('a book that was not cached says it is offline', async ({ page, context }) => {
  const song = findPage('song', 'any song');
  const otherBook = findPage('contents', 'another book', (candidate) => candidate.route.bookId !== song.route.bookId);

  await page.goto(pathOf(song));
  await waitForApp(page);
  await waitForBookCached(page, song.route.bookId);

  await context.setOffline(true);
  await page.goto(pathOf(otherBook));

  await expect(page).toHaveURL(pathOf(otherBook));
  await expect(page.locator('.AppRoot__offline h1')).toHaveText("You're offline");
});

// A new build cannot reach an offline reader (each build has its own cache), so the
// document-load fallback offline only happens for data that is not cached.
test('offline, client navigation to a book that was not cached ends at the offline note once; Go back returns', async ({
  page,
  context
}) => {
  const song = findPage('song', 'any song');
  const { bookId } = song.route;
  const href = pathOf(findPage('contents', 'another book', (candidate) => candidate.route.bookId !== bookId));

  await page.goto(pathOf(song));
  await waitForApp(page);
  await waitForBookCached(page, bookId);
  await context.setOffline(true);

  // The songbook list greys out the books that were not cached: no links to them.
  await page.keyboard.press('b');
  await expect(page).toHaveURL(`/${bookId}/`);
  await expect(page.locator('main .BookCard--disabled').first()).toBeVisible();
  await expect(page.locator(`main .BookCard a[href^="/"]:not([href^="/${bookId}/"])`)).toHaveCount(0);

  const documentLoads: string[] = [];
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentLoads.push(request.url());
  });
  await clickLinkTo(page, href);

  await expect(page).toHaveURL(href);
  await expect(page.locator('.AppRoot__offline h1')).toHaveText("You're offline");
  // Give a reload loop the time to show itself.
  await page.waitForTimeout(1000);
  expect(documentLoads).toEqual([new URL(href, page.url()).href]);

  await page.locator('.AppRoot__offline button').click();
  await expect(page).toHaveURL(`/${bookId}/`);
  await expect(page.locator('main a[href]').first()).toBeVisible();
});

/* The book job (bundle, status records, static files) --------------------------- */

/**
 * A song, and another song of the same book that the test opens later. Not a
 * neighbour of the first: the router prefetches those 1 s after the page is
 * shown, and a prefetch that is quicker than the book job stores its page.
 */
function findTwoSongs() {
  const song = findPage('song', 'a song with another song in its book');
  const neighbours = Object.values(getNeighbours(song)).map((item) => item?.path.split('?')[0]);
  const other = findPage('song', 'another song of that book, not next to it', (candidate) =>
    candidate.route.bookId === song.route.bookId &&
    candidate.route.slug !== song.route.slug &&
    !neighbours.includes(pathOf(candidate))
  );
  return { bookId: song.route.bookId, other, song };
}

/** Client navigation to `path`, as a click on a link of the page. */
async function clickLinkTo(page: Page, path: string) {
  await page.evaluate((href) => {
    const link = Object.assign(document.createElement('a'), { href });
    document.querySelector('main').append(link);
    link.click();
  }, path);
}

/** Opens the songbook list of a book: an app page that starts no book job. */
async function openBookList(page: Page, bookId: string) {
  await page.goto(`/${bookId}/`);
  await waitForApp(page);
  await waitForWorker(page);
}

/** A song of a book with content images that shows one of them. */
const findSongWithImage = () =>
  findPage('song', 'a song with a content image', (candidate) => JSON.stringify(candidate.data).includes('/images/resources/'));

const SHARED_RECORD_URL = '/data/cache-status.json';
const recordUrlOf = (bookId: string) => `/data/${bookId}/cache-status.json`;
const bundleUrlOf = (bookId: string) => `/data/${bookId}/bundle.json`;

test('the songbook list has the shell, logos and covers cached by the worker, and starts no book job', async ({ page }) => {
  const bundleRequests = recordRequests(page, bundleUrlOf('en'));
  await openBookList(page, 'en');
  // Give the idle callback of the app the time to show itself.
  await page.waitForTimeout(1500);

  const paths = await listCachedPaths(page);
  expect(paths).toContain('/shell/');
  // The root page is not part of the shell: offline the shell renders it.
  expect(paths).not.toContain('/');
  expect(paths.some((path) => /^\/_next\/static\/.+\.js$/.test(path)), 'the JS of the shell').toBe(true);
  expect(paths.some((path) => /^\/_next\/static\/.+\.css$/.test(path)), 'the CSS of the shell').toBe(true);
  expect(paths.some((path) => /^\/_next\/static\/media\/.+\.woff2?$/.test(path)), 'the icon font').toBe(true);
  expect(paths.filter((path) => path.startsWith('/data/'))).toEqual([SHARED_RECORD_URL]);
  expect(bundleRequests).toEqual([]);
  expect(await getBookCacheStatus(page, 'en')).toBeUndefined();

  // The install listed the shell files and cached the logos and covers of all songbooks.
  const shared = await getStatusRecord<TSharedCacheRecord>(page, SHARED_RECORD_URL);
  expect(shared.appFiles.files).toContain('/shell/');
  expect(shared.appFiles.files).not.toContain('/');
  expect(shared.appFiles.files.filter((file) => !paths.includes(file))).toEqual([]);
  expect(shared.appFiles.missing).toEqual([]);
  expect(shared.images.files).toEqual(getSharedImages());
  expect(shared.images.missing).toEqual([]);
  expect(shared.images.files.filter((file) => !paths.includes(file))).toEqual([]);
  // The list itself is not stored.
  expect(paths).not.toContain('/shell/assets.json');
});

test('a book job stores the bundle and the status records with the lists of files, and no page entries', async ({
  page
}) => {
  const { contentImages } = getBookBundle('en').assets;
  await openBookList(page, 'en');

  const status = await ensureBookNow(page, 'en');
  const paths = await listCachedPaths(page);
  const info = await getBookCacheInfo(page, 'en');
  const shared = await getStatusRecord<TSharedCacheRecord>(page, SHARED_RECORD_URL);
  const record = await getStatusRecord<TBookCacheRecord>(page, recordUrlOf('en'));

  expect(status).toMatchObject({ bookId: 'en', pages: true, state: 'cached' });
  expect(status.images.cached).toBe(status.images.total);
  expect(paths.filter((path) => path.startsWith('/data/')).sort()).toEqual([
    SHARED_RECORD_URL,
    bundleUrlOf('en'),
    recordUrlOf('en')
  ]);
  expect(shared.images).toEqual({ files: getSharedImages(), missing: [] });
  expect(shared.appFiles.missing).toEqual([]);
  expect(record).toEqual({ contentImages: { files: [...new Set(contentImages)], missing: [] } });
  expect(info.pages).toBe(Object.keys(getBookBundle('en').pages).length);
  // The bundle and the book's record.
  expect(info.texts.count).toBe(2);
  expect(info.texts.bytes).toBeGreaterThan(0);
  expect(info.bookImages).toMatchObject({ count: new Set(contentImages).size, total: new Set(contentImages).size });
  expect(info.appImages.count).toBe(info.appImages.total);
  expect(info.appImages.count).toBe(getSharedImages().length);
  // `/shell/`; JS, CSS, fonts and the shared record.
  expect(info.appHtml.count).toBeGreaterThanOrEqual(1);
  expect(info.appResources.count).toBeGreaterThanOrEqual(shared.appFiles.files.length);
  const groups = [info.texts, info.bookImages, info.appImages, info.appHtml, info.appResources];
  expect(info.bookTotalBytes).toBe(groups.reduce((sum, group) => sum + group.bytes, 0));
  expect(info.allTotalBytes).toBeGreaterThanOrEqual(info.bookTotalBytes);
});

test('a page is served from the bundle; no page entry is written', async ({ page, context }) => {
  const { bookId, other, song } = findTwoSongs();
  await page.goto(pathOf(song));
  await waitForApp(page);
  await waitForBookCached(page, bookId);
  expect(await listCachedPaths(page)).not.toContain(dataUrlOf(other));

  await context.setOffline(true);
  await page.goto(pathOf(other));

  await expect(page.locator('h1')).toContainText(other.data.song.title[0].trim());
  expect(await listCachedPaths(page)).not.toContain(dataUrlOf(other));
});

test('a deleted app file is fetched again when the page asks for it', async ({ page }) => {
  await page.goto('/en/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'en');
  const paths = await listCachedPaths(page);
  const scripts = await page.locator('script[src^="/_next/static/"]').evaluateAll((list) => list.map((script) => script.getAttribute('src')));
  const script = scripts.find((src) => paths.includes(src));
  expect(script, 'a script of the page is cached').toBeDefined();
  await deleteCached(page, [script]);

  await page.reload();
  await waitForApp(page);

  await expect.poll(() => listCachedPaths(page)).toContain(script);
});

test('a missing bundle is fetched again, once', async ({ page }) => {
  await page.goto('/en/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'en');
  await deleteCached(page, [bundleUrlOf('en')]);
  const bundleRequests = recordRequests(page, bundleUrlOf('en'));

  await page.reload();
  await waitForApp(page);
  await waitForBookCached(page, 'en');
  await ensureBookNow(page, 'en');

  expect(bundleRequests).toHaveLength(1);
});

test('with everything cached, a reload and a book job fetch nothing', async ({ page }) => {
  await page.goto('/en/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'en');
  const requests = recordRequests(page, getBookJobFiles('en'), { isWorkerOnly: true });

  await page.reload();
  await waitForApp(page);
  const status = await ensureBookNow(page, 'en');

  expect(status).toMatchObject({ pages: true, state: 'cached' });
  expect(status.images.cached).toBe(status.images.total);
  expect(requests).toEqual([]);
});

test('without the shared record, a book job lists the shell again and fetches only the deleted app file', async ({
  page
}) => {
  await page.goto('/en/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'en');
  const { appFiles } = await getStatusRecord<TSharedCacheRecord>(page, SHARED_RECORD_URL);
  const deleted = appFiles.files.find((file) => file.startsWith('/_next/static/'));
  expect(deleted, 'an app file of the shell').toBeDefined();
  await deleteCached(page, [SHARED_RECORD_URL, deleted]);
  const requests = recordRequests(page, appFiles.files, { isWorkerOnly: true });

  const status = await ensureBookNow(page, 'en');

  expect(status).toMatchObject({ pages: true, state: 'cached' });
  expect(requests).toEqual([deleted]);
  const after = await getStatusRecord<TSharedCacheRecord>(page, SHARED_RECORD_URL);
  expect(after.appFiles).toEqual({ files: expect.arrayContaining(appFiles.files), missing: [] });
});

test('a page of a book that is not cached comes from the network and is stored; the book is cached once', async ({
  page
}) => {
  const { bookId, other } = findTwoSongs();
  const bundleRequests = recordRequests(page, bundleUrlOf(bookId));
  await openBookList(page, bookId);

  await clickLinkTo(page, pathOf(other));

  await expect(page).toHaveURL(pathOf(other));
  await expect(page.locator('h1')).toContainText(other.data.song.title[0].trim());
  await expect.poll(() => listCachedPaths(page)).toContain(dataUrlOf(other));
  await waitForBookCached(page, bookId);
  // The delayed job of the data request finds the job of the app, or its result.
  await page.waitForTimeout(2500);
  expect(bundleRequests).toHaveLength(1);
});

test('without the status record the pages are cached but not the book; the next job writes it and fetches nothing', async ({
  page
}) => {
  await page.goto('/en/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'en');
  await deleteCached(page, [recordUrlOf('en')]);
  expect(await getBookCacheStatus(page, 'en')).toEqual({ bookId: 'en', pages: true, state: 'none' });
  const requests = recordRequests(page, getBookJobFiles('en'), { isWorkerOnly: true });

  const status = await ensureBookNow(page, 'en');

  expect(status).toMatchObject({ pages: true, state: 'cached' });
  expect(await listCachedPaths(page)).toContain(recordUrlOf('en'));
  expect(requests).toEqual([]);
});

test('without the shared record the book is not cached; the next job writes it again', async ({ page }) => {
  await page.goto('/en/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'en');
  const before = await getStatusRecord<TSharedCacheRecord>(page, SHARED_RECORD_URL);
  await deleteCached(page, [SHARED_RECORD_URL]);
  expect(await getBookCacheStatus(page, 'en')).toEqual({ bookId: 'en', pages: true, state: 'none' });
  const requests = recordRequests(page, getBookJobFiles('en'), { isWorkerOnly: true });

  const status = await ensureBookNow(page, 'en');
  const after = await getStatusRecord<TSharedCacheRecord>(page, SHARED_RECORD_URL);

  expect(status).toMatchObject({ pages: true, state: 'cached' });
  expect(after.images).toEqual(before.images);
  expect([...after.appFiles.files].sort()).toEqual([...before.appFiles.files].sort());
  expect(after.appFiles.missing).toEqual([]);
  expect(requests).toEqual([]);
});

test('files deleted from the cache are fetched by the next job, although the records list them as cached', async ({
  page
}) => {
  const { bookId } = findSongWithImage().route;
  const { contentImages } = getBookBundle(bookId).assets;
  const bookImages = getSharedImages().filter((file) => file.startsWith('/images/cover/'));
  await page.goto(`/${bookId}/contents/`);
  await waitForApp(page);
  await waitForBookCached(page, bookId);
  const shared = await getStatusRecord<TSharedCacheRecord>(page, SHARED_RECORD_URL);
  const script = shared.appFiles.files.find((file) => file.endsWith('.js'));
  const deleted = [script, bookImages[0], contentImages[0]];
  await deleteCached(page, deleted);
  const requests = recordRequests(page, deleted, { isWorkerOnly: true });

  const status = await ensureBookNow(page, bookId);

  expect(status.images.cached).toBe(status.images.total);
  expect(status.contentImages.cached).toBe(status.contentImages.total);
  expect([...requests].sort()).toEqual([...deleted].sort());
  expect(await listCachedPaths(page)).toEqual(expect.arrayContaining(deleted));
});

test('an image deleted together with the status record is the only file the next job fetches', async ({ page }) => {
  const { bookId } = findSongWithImage().route;
  const [image] = getBookBundle(bookId).assets.contentImages;
  await page.goto(`/${bookId}/contents/`);
  await waitForApp(page);
  await waitForBookCached(page, bookId);
  await deleteCached(page, [recordUrlOf(bookId), image]);
  const requests = recordRequests(page, getBookJobFiles(bookId), { isWorkerOnly: true });

  const status = await ensureBookNow(page, bookId);

  expect(status.contentImages.cached).toBe(status.contentImages.total);
  expect(requests).toEqual([image]);
});

test('a job started offline keeps the last state: cached stays cached, nothing cached is not an error', async ({
  page,
  context
}) => {
  const song = findPage('song', 'any song');
  const { bookId } = song.route;
  const otherBook = findPage('contents', 'another book', (candidate) => candidate.route.bookId !== bookId).route.bookId;
  await page.goto(pathOf(song));
  await waitForApp(page);
  await waitForBookCached(page, bookId);

  await context.setOffline(true);

  expect(await ensureBookNow(page, bookId)).toMatchObject({ pages: true, state: 'cached' });
  expect(await ensureBookNow(page, otherBook)).toEqual({ bookId: otherBook, pages: false, state: 'none' });
  expect(await getBookCacheStatus(page, otherBook)).toBeUndefined();
});

test('a page of another build from the network is not stored', async ({ page }) => {
  const { bookId, other } = findTwoSongs();
  const dataUrl = dataUrlOf(other);
  await page.context().route(
    (url) => url.pathname === dataUrl,
    (route) => route.fulfill({ json: { ...other, build: 'another-build' } })
  );
  await openBookList(page, bookId);

  // The router rejects the page and loads the document instead.
  await clickLinkTo(page, pathOf(other));

  await expect(page).toHaveURL(pathOf(other));
  await expect(page.locator('h1')).toContainText(other.data.song.title[0].trim());
  await waitForApp(page);
  // A newer deploy is live: this worker starts no more jobs.
  expect(await ensureBookNow(page, bookId)).toEqual({ bookId, pages: false, state: 'none' });
  expect(await listCachedPaths(page)).not.toContain(dataUrl);
});

/* Images ------------------------------------------------------------------------ */

/** Every image of `selector` has loaded (offline: from the cache). */
async function expectImagesLoaded(page: Page, selector: string) {
  const images = page.locator(selector);
  await expect(images.first()).toBeAttached();
  await expect
    .poll(() =>
      images.evaluateAll((list: HTMLImageElement[]) =>
        list.filter((image) => !(image.complete && image.naturalWidth > 0)).map((image) => image.currentSrc || image.src)
      )
    )
    .toEqual([]);
}

test('songbook covers work offline', async ({ page, context }) => {
  const { bookId, song } = findTwoSongs();
  await page.goto(pathOf(song));
  await waitForApp(page);
  await waitForBookCached(page, bookId);

  await context.setOffline(true);
  await page.goto(`/${bookId}/other/`);

  await expectImagesLoaded(page, 'main .BookCard__image');
});

test('content images work offline', async ({ page, context }) => {
  const song = findSongWithImage();
  const { bookId } = song.route;
  await page.goto(`/${bookId}/contents/`);
  await waitForApp(page);
  await waitForBookCached(page, bookId);

  await context.setOffline(true);
  await page.goto(pathOf(song));

  await expect(page.locator('h1')).toContainText(song.data.song.title[0].trim());
  await expectImagesLoaded(page, 'main img[src*="/images/resources/"]');
});

test('Save-Data skips the content images, not the covers; a later job without it fetches them', async ({ page }) => {
  const { bookId } = findSongWithImage().route;
  const { contentImages } = getBookBundle(bookId).assets;
  const bookImages = getSharedImages().filter((file) => !file.startsWith('/images/svg/'));
  const shared = getSharedImages().length;

  // The songbook list starts no job of its own.
  await openBookList(page, bookId);
  const status = await ensureBookNow(page, bookId, { storeBigImages: false });
  const paths = await listCachedPaths(page);

  expect(paths.filter((path) => path.startsWith('/images/resources/'))).toEqual([]);
  expect(bookImages.filter((path) => !paths.includes(path))).toEqual([]);
  expect(status).toEqual({
    bookId,
    pages: true,
    state: 'cached',
    images: { cached: shared, total: shared },
    contentImages: { cached: 0, total: contentImages.length }
  });

  // The details of the popup count the skipped content images as not cached.
  // (The songbook list has no header dot, so they are asked from the worker.)
  const info = await getBookCacheInfo(page, bookId);
  expect(info.bookImages).toMatchObject({ count: 0, total: new Set(contentImages).size });
  expect(info.appImages).toMatchObject({ count: shared, total: shared });

  // A job that may fetch them finds them missing.
  const next = await ensureBookNow(page, bookId);
  expect(next.contentImages).toEqual({ cached: contentImages.length, total: contentImages.length });
});

/* The dot and the popup ---------------------------------------------------------- */

/** Opens the popup of the header dot. */
async function openCachePopup(page: Page) {
  await page.locator('.Header .CacheStatusButton').click();
  const popup = page.getByRole('dialog');
  await expect(popup.locator('.CacheStatusModal')).toBeVisible();
  return popup;
}

test('the header dot of a book page turns green once the book is cached; the popup and the book card show it', async ({
  page
}) => {
  const pages = Object.keys(getBookBundle('en').pages).length;
  const dot = page.locator('.Header .CacheStatusButton[data-book="en"] .CacheLed');

  // The songbook list starts no book job and has no header dot.
  await openBookList(page, 'en');
  await expect(page.locator('.Header .CacheStatusButton')).toHaveCount(0);
  await expect(page.locator('main .BookCard .CacheLed')).toHaveCount(0);

  // A page of the book starts the job.
  await page.keyboard.press('c');
  await expect(page).toHaveURL('/en/contents/');
  await waitForBookCached(page, 'en');
  await expect(dot).toHaveAttribute('data-status', 'cached');

  const popup = await openCachePopup(page);
  await expect(popup.locator('.AppModal__title')).toHaveText('Available offline');
  await expect(popup.locator('.AppModal__title .CacheLed')).toHaveAttribute('data-status', 'cached');
  await expect(popup.locator('[data-row="texts"] dd')).toHaveText(new RegExp(`^${pages} · \\d+\\.\\d (KB|MB)$`));
  await expect(popup.locator('[data-row="bookTotal"] dd')).toHaveText(/^\d+\.\d (KB|MB)$/);
  // Only this book is cached: the all-songbooks total would repeat the songbook total.
  await expect(popup.locator('[data-row="allTotal"]')).toHaveCount(0);
  // All images are cached: just the count, no `cached / total`.
  for (const row of ['bookImages', 'appImages', 'appResources', 'appHtml']) {
    await expect(popup.locator(`[data-row="${row}"] dd`)).toHaveText(/^\d+ · \d+\.\d (KB|MB)$/);
  }
  await popup.locator('.AppModal__button').click();
  await expect(popup).toHaveCount(0);

  // Only the card of the cached book has a dot; the list has no header dot.
  await page.keyboard.press('b');
  await expect(page).toHaveURL('/en/');
  await expect(page.locator('.Header .CacheStatusButton')).toHaveCount(0);
  await expect(page.locator('main .BookCard .CacheLed')).toHaveCount(1);
  await expect(page.locator('main .BookCard:has(a[href="/en/a-z/"]) .CacheLed')).toHaveAttribute(
    'data-status',
    'cached'
  );
});

test('offline, the popup has the "Offline" note and still counts the cached book', async ({ page, context }) => {
  const pages = Object.keys(getBookBundle('en').pages).length;
  await page.goto('/en/contents/');
  await waitForApp(page);
  await waitForBookCached(page, 'en');

  await context.setOffline(true);
  const popup = await openCachePopup(page);

  await expect(popup.locator('.CacheStatusModal__offline')).toHaveText('Offline');
  await expect(popup.locator('.AppModal__title')).toHaveText('Available offline');
  await expect(popup.locator('[data-row="texts"] dd')).toHaveText(new RegExp(`^${pages} · \\d+\\.\\d (KB|MB)$`));
  await expect(popup.locator('[data-row="appResources"] dd')).toHaveText(/^\d+ · \d+\.\d (KB|MB)$/);
});
