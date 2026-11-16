import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test as base } from '@playwright/test';

import type { Page, TestInfo } from '@playwright/test';
import type { TBookBundle, TPageData, TPageDataOf, TPageKind } from '@/types/pageData';
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

/* Data finders (R1, R2: never a song name, always a feature) ---------------- */

/** Book ids of the build. */
export function getBookIds(): string[] {
  return readdirSync(path.join(SITE_DIR, 'data'));
}

const bundles = new Map<string, TBookBundle>();

/** Every page of a book, as the build has it. */
export function getBookPages(bookId: string): TPageData[] {
  if (!bundles.has(bookId)) {
    bundles.set(bookId, JSON.parse(readFileSync(path.join(SITE_DIR, 'data', bookId, 'bundle.json'), 'utf8')));
  }

  return Object.values(bundles.get(bookId).pages);
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
