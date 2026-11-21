import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test as base } from '@playwright/test';

import type { Page, TestInfo } from '@playwright/test';
import type { TBookCacheInfo, TBookCacheStatus, TCacheStatusReply } from '@/types/offline';
import type { TBookBundle, TPageData, TPageDataOf, TPageKind, TSharedAssets } from '@/types/pageData';
import type { TNavItem } from '@/types/song';

/**
 * Playwright fixtures and data finders for L7 (.github/plans/plan-tests.md, D3):
 * nothing leaves the local server, and a test fails on any console error.
 */

const SITE_DIR = path.resolve(process.env.KIRTAN_BUILD_DIR || '.test-output/site');

/* Fixtures ------------------------------------------------------------------ */

/**
 * Stand-in for the SoundCloud widget API: a widget that "plays" by sending
 * progress events. `window.__sc.finish()` ends the current track.
 */
const FAKE_SOUNDCLOUD_API = `
window.SC = { Widget: Object.assign(function () {
  const handlers = {};
  let position = 0, timer = null;
  const fire = (event, arg) => (handlers[event] || []).forEach((handler) => handler(arg));
  const stop = () => { clearInterval(timer); timer = null; };
  const widget = {
    bind(event, handler) { (handlers[event] = handlers[event] || []).push(handler); },
    load(url, options) { stop(); position = 0; window.__sc.url = url; setTimeout(() => options.callback && options.callback(), 10); },
    play() {
      stop();
      setTimeout(() => fire('play'), 0);
      timer = setInterval(() => { position += 250; fire('playProgress', { currentPosition: position }); }, 250);
    },
    pause() { stop(); setTimeout(() => fire('pause'), 0); },
    seekTo(ms) { position = ms; },
    getDuration(callback) { setTimeout(() => callback(180000), 0); }
  };
  window.__sc = { widget, finish() { stop(); fire('finish'); } };
  setTimeout(() => fire('ready'), 10);
  return widget;
}, { Events: { READY: 'ready', PLAY: 'play', PAUSE: 'pause', FINISH: 'finish', PLAY_PROGRESS: 'playProgress', ERROR: 'error' } }) };
`;

// The fixture callback is not named `use`: the React hooks lint rule would take it for `React.use`.
export const test = base.extend<{ guard: void }>({
  page: async ({ page, baseURL }, provide) => {
    const origin = new URL(baseURL).origin;

    await page.context().route(
      (url) => url.origin !== origin,
      (route) => {
        const url = route.request().url();
        if (url.startsWith('https://w.soundcloud.com/player/api.js')) {
          return route.fulfill({ contentType: 'text/javascript', body: FAKE_SOUNDCLOUD_API });
        }
        // Everything else outside the site (widget frame, search API, images) gets an empty answer.
        return route.fulfill({ status: 200, contentType: 'text/html', body: '' });
      }
    );

    await provide(page);
  },

  guard: [
    async ({ page }, provide, testInfo) => {
      const errors: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(`${error.name}: ${error.message}`));

      await provide();

      const patterns = allowedErrors.get(testInfo) ?? [];
      const unexpected = errors.filter((text) => !patterns.some((pattern) => pattern.test(text)));
      expect(unexpected, 'console errors or page errors').toEqual([]);
    },
    { auto: true }
  ]
});

const allowedErrors = new WeakMap<TestInfo, RegExp[]>();

/** Lets the running test expect console errors (e.g. failed requests while offline). */
export function allowErrors(...patterns: RegExp[]): void {
  const info = test.info();
  allowedErrors.set(info, [...(allowedErrors.get(info) ?? []), ...patterns]);
}

export { expect };

/* Page state ---------------------------------------------------------------- */

/**
 * Marks the current document; `isSameDocument` is true while no full page
 * load happened since, i.e. navigation stayed inside the client app.
 */
export async function markDocument(page: Page): Promise<() => Promise<boolean>> {
  const mark = `${Date.now()}-${Math.random()}`;
  await page.evaluate((value) => ((window as unknown as { __docMark: string }).__docMark = value), mark);

  return () => page.evaluate((value) => (window as unknown as { __docMark?: string }).__docMark === value, mark);
}

/** Waits until the app has hydrated: client links are intercepted only after that. */
export async function waitForApp(page: Page): Promise<void> {
  await page.waitForFunction(() => !!document.querySelector('main') && document.readyState === 'complete');
  // React attaches its root listeners on hydration; the router marks history entries.
  await page.waitForFunction(() => !!(history.state && '__kirtanKey' in history.state));
}

/* Offline cache (public/sw.js) ---------------------------------------------- */

/** Sends a message to the page's service worker and resolves with its reply. */
function askWorker<T>(page: Page, message: object): Promise<T> {
  return page.evaluate(
    async (data) => {
      const registration = await navigator.serviceWorker.ready;
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => resolve(event.data);
        registration.active.postMessage(data, [channel.port2]);
      });
    },
    message
  ) as Promise<T>;
}

/** Waits until the service worker controls the page: from then on its requests pass the worker. */
export async function waitForWorker(page: Page): Promise<void> {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}

/** State of a book as the worker reports it; `undefined` when nothing of it is cached. */
export async function getBookCacheStatus(page: Page, bookId: string): Promise<TBookCacheStatus | undefined> {
  return (await askWorker<TCacheStatusReply>(page, { type: 'GET_CACHE_STATUS', bookIds: [bookId] })).books[bookId];
}

/**
 * Waits until the header dot of the book is green: the worker reported the
 * book as cached (bundle and status records), i.e. the job the app started
 * has ended. The page on screen must be a page of that book.
 */
export async function waitForBookCached(page: Page, bookId: string): Promise<void> {
  await expect(
    page.locator(`.Header .CacheStatusButton[data-book="${bookId}"] .CacheLed[data-status="cached"]`),
    `${bookId} is cached`
  ).toBeVisible({ timeout: 30_000 });
}

/** Runs the book job in the worker now (or joins the running one) and gives its final status. */
export function ensureBookNow(page: Page, bookId: string, { storeBigImages = true } = {}): Promise<TBookCacheStatus> {
  return askWorker<TBookCacheStatus>(page, { type: 'ENSURE_BOOK', bookId, storeBigImages });
}

/** A status record as the worker has it (it answers the URL from its cache only); `null` when there is none. */
export function getStatusRecord<T>(page: Page, url: string): Promise<T | null> {
  return page.evaluate(async (recordUrl) => {
    const response = await fetch(recordUrl);
    return response.ok ? response.json() : null;
  }, url);
}

/** Details of a cached book (`GET_BOOK_CACHE_INFO`). */
export function getBookCacheInfo(page: Page, bookId: string): Promise<TBookCacheInfo> {
  return askWorker<TBookCacheInfo>(page, { type: 'GET_BOOK_CACHE_INFO', bookId });
}

/**
 * Site paths (`/data/en/bundle.json`) of every entry in the worker's caches.
 * The status records are among them: the shared `/data/cache-status.json`
 * since install, and `/data/<book>/cache-status.json` of a cached book.
 */
export function listCachedPaths(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) {
        const url = new URL(request.url);
        paths.push(url.pathname + url.search);
      }
    }
    return paths;
  });
}

/** Deletes cache entries by site path, as the browser does when it evicts them. */
export async function deleteCached(page: Page, paths: string[]): Promise<void> {
  const missing = await page.evaluate(async (list) => {
    const deleted = new Set<string>();
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const path of list) if (await cache.delete(path)) deleted.add(path);
    }
    return list.filter((path) => !deleted.has(path));
  }, paths);
  expect(missing, 'entries to delete were in the cache').toEqual([]);
}

/**
 * Paths of the requests to `pathname` (or to one of several), also those the
 * service worker sends. With `isWorkerOnly`, only those: what the worker asked
 * the network for, without the page requests it answered from its cache.
 */
export function recordRequests(page: Page, pathname: string | string[], { isWorkerOnly = false } = {}): string[] {
  const wanted = new Set([pathname].flat());
  const paths: string[] = [];
  page.context().on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (wanted.has(path) && (!isWorkerOnly || request.serviceWorker())) paths.push(path);
  });
  return paths;
}

/** Every file the book job of the worker may fetch for a book: its bundle and its static files. */
export function getBookJobFiles(bookId: string): string[] {
  return [`/data/${bookId}/bundle.json`, ...getSharedImages(), ...getBookBundle(bookId).assets.contentImages];
}

/** Logos and covers of all songbooks, as `/shell/assets.json` of the build lists them: unique, in its order. */
export function getSharedImages(): string[] {
  const { bookImages, shell }: TSharedAssets = JSON.parse(readFileSync(path.join(SITE_DIR, 'shell', 'assets.json'), 'utf8'));
  return [...new Set([...shell, ...bookImages])];
}

/* Data finders (R1, R2: never a song name, always a feature) ---------------- */

/** Book ids of the build. */
export function getBookIds(): string[] {
  return readdirSync(path.join(SITE_DIR, 'data'));
}

const bundles = new Map<string, TBookBundle>();

/** The offline bundle of a book, as the build has it. */
export function getBookBundle(bookId: string): TBookBundle {
  if (!bundles.has(bookId)) {
    bundles.set(bookId, JSON.parse(readFileSync(path.join(SITE_DIR, 'data', bookId, 'bundle.json'), 'utf8')));
  }

  return bundles.get(bookId);
}

/** Every page of a book, as the build has it. */
export function getBookPages(bookId: string): TPageData[] {
  return Object.values(getBookBundle(bookId).pages);
}

/** Data URL of a page found with the finders below, e.g. `/data/en/x.json`. */
export function dataUrlOf(page: TPageData): string {
  return Object.entries(getBookBundle(page.route.bookId).pages).find(([, candidate]) => candidate === page)[0];
}

/** First page of this kind, over all books, that matches; fails the test when none does. */
export function findPage<K extends TPageKind>(
  kind: K,
  description: string,
  matches: (page: TPageDataOf<K>) => boolean = () => true
): TPageDataOf<K> {
  for (const bookId of getBookIds()) {
    const page = getBookPages(bookId).find((candidate) => candidate.kind === kind && matches(candidate as TPageDataOf<K>));
    if (page) return page as TPageDataOf<K>;
  }

  throw new Error(`No ${kind} page in the build covers "${description}".`);
}

/** Path of a page, e.g. `/en/contents/`. */
export function pathOf(page: TPageData): string {
  return page.head.canonical;
}

/** Previous and next item of a song (for its first page number). */
export function getNeighbours(page: TPageDataOf<'song'>): { prev?: TNavItem; next?: TNavItem } {
  const [nav] = Object.values(page.data.nav);
  return { prev: nav?.prev || undefined, next: nav?.next || undefined };
}
