import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { applyHead } from '@/other/router/head';
import { getRoutePath, parsePath, ROUTE_KIND } from '@/other/router/routes';
import { loadRoute, prefetchRoute, seedRoute } from '@/other/router/pageStore';
import { notifyLocationChange } from '@/other/router/location';
import { setNavigationHandler } from '@/other/router/navigate';
import { pickRootBookIdInBrowser, ROOT_PATH, ROOT_PENDING_ATTR } from '@/other/router/pickRootBookId';

import type { TNavigateOptions } from '@/other/router/navigate';
import type { TPageData } from '@/types/pageData';

/** Loading indicator shows only for navigations slower than this. */
const LOADER_DELAY_MS = 150;

/** The page is shown first; its likeliest next pages are prefetched this much later. */
const PREFETCH_DELAY_MS = 1000;

/** Our id in `history.state`, used to restore the scroll position on back/forward. */
const KEY = '__kirtanKey';

/**/
type TScrollTarget = number | string;  // scrollTop, or a `#hash` to reveal.

type TState = {
  page: TPageData | null;  // `null` until the shell document has loaded its page.
  // Set by a push/replace navigation; applied to history after the commit.
  history?: { href: string; key: string; replace: boolean };
  scroll?: TScrollTarget;
};

/**/
type TAppRouter = {
  isFailed: boolean;  // The shell document couldn't load data for its URL (offline, not cached).
  isLoading: boolean;
  page: TPageData | null;
};

/**
 * Client router of the app root: renders page data fetched from `/data/`,
 * intercepts internal links and keeps history, scroll and head in sync.
 * `initial` is `null` in the offline shell; the page for the URL loads on mount.
 * On the root page `/` it moves on to the reader's songbook (`pickRootBookId`).
 * `getPrefetchPaths` names the pages to prefetch once a page is shown. The
 * router must not import the views registry, so the app root passes it in;
 * it must be a stable function.
 */
export function useAppRouter(
  initial: TPageData | null,
  getPrefetchPaths?: (page: TPageData) => Array<string>
): TAppRouter {
  const [state, setState] = useState<TState>({ page: initial });
  const [isLoading, setLoading] = useState(false);
  const [isFailed, setFailed] = useState(false);

  const navId = useRef(0);
  const entryKey = useRef('');
  const renderedPath = useRef('');
  const scrollMemory = useRef(new Map<string, number>());

  useEffect(() => {
    entryKey.current = ensureEntryKey();
    const isRoot = window.location.pathname === ROOT_PATH;
    if (initial) {
      seedRoute(initial);
      renderedPath.current = window.location.pathname;
    } else if (!isRoot) {
      const route = parsePath(window.location.pathname);
      (route ? loadRoute(route) : Promise.reject(new Error('Not an app page'))).then(
        (page) => setState({ page, scroll: window.location.hash || 0 }),
        () => setFailed(true)
      );
    }

    // `onFail` replaces the fallback to a document load.
    const go = async (url: URL, options: TNavigateOptions, popKey?: string, onFail?: () => void) => {
      const isPop = popKey !== undefined;

      if (url.pathname === renderedPath.current) {
        // Same page: only the query (e.g. `?p=`) or the hash changed.
        if (isPop) {
          entryKey.current = popKey;
          return;
        }
        const href = url.href;
        const key = newKey();
        writeHistory(href, key, !!options.replace || href === window.location.href);
        entryKey.current = key;
        notifyLocationChange();
        scrollTo(url.hash || 0);
        return;
      }

      const route = parsePath(url.pathname);
      const id = ++navId.current;
      const timer = setTimeout(() => setLoading(true), LOADER_DELAY_MS);

      let page: TPageData;
      try {
        if (!route) throw new Error('Not an app page');
        page = await loadRoute(route);
      } catch {
        if (id !== navId.current) return;
        if (onFail) onFail();
        else if (isPop) window.location.reload();
        else window.location.assign(url.href);
        return;
      } finally {
        clearTimeout(timer);
      }

      if (id !== navId.current) return;
      setLoading(false);

      if (isPop) {
        entryKey.current = popKey;
        setState({ page, scroll: scrollMemory.current.get(popKey) ?? 0 });
      } else {
        rememberScroll();
        setState({
          page,
          history: { href: url.href, key: newKey(), replace: !!options.replace },
          scroll: url.hash || 0
        });
      }
    };

    const rememberScroll = () => {
      const scroller = getScroller();
      if (scroller && entryKey.current) scrollMemory.current.set(entryKey.current, scroller.scrollTop);
    };

    const onClick = (e: MouseEvent) => {
      const url = getAppLinkUrl(e);
      if (!url) return;
      // Plain in-page anchors keep the browser's own behaviour.
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      e.preventDefault();
      go(url, {});
    };

    const onPopState = (e: PopStateEvent) => {
      rememberScroll();
      go(new URL(window.location.href), {}, (e.state?.[KEY] as string) ?? '');
    };

    const onIntent = (e: Event) => {
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      const url = link && new URL(link.href);
      const route = url && url.origin === window.location.origin && parsePath(url.pathname);
      if (route && url.pathname !== renderedPath.current) prefetchRoute(route);
    };

    // The root page shows the first songbook. Move to the reader's songbook:
    // the URL becomes `/<book>/`, the list comes from the page data (cached
    // when that book is), with no document load. When it cannot be loaded
    // (offline, book not cached) the first songbook stays.
    const openRootBook = () => {
      const [firstBookId] = __BOOK_IDS__;
      const target = pickRootBookIdInBrowser(__BOOK_IDS__);
      const urlOf = (bookId: string) =>
        new URL(getRoutePath({ kind: ROUTE_KIND.BOOK_LIST, bookId }) + window.location.search + window.location.hash, window.location.href);
      const fail = () => {
        clearRootPending();
        if (!initial) setFailed(true);
      };

      go(
        urlOf(target),
        { replace: true },
        undefined,
        target === firstBookId ? fail : () => go(urlOf(firstBookId), { replace: true }, undefined, fail)
      );
    };
    if (isRoot) openRootBook();

    setNavigationHandler((url, options) => go(url, options));
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onIntent, { passive: true });
    document.addEventListener('touchstart', onIntent, { passive: true });
    window.addEventListener('popstate', onPopState);

    return () => {
      setNavigationHandler(null);
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onIntent);
      document.removeEventListener('touchstart', onIntent);
      window.removeEventListener('popstate', onPopState);
    };
  }, [initial]);

  // History, head and scroll follow the committed page, before paint.
  const applied = useRef(state);
  useLayoutEffect(() => {
    if (applied.current === state) return;
    applied.current = state;

    const { history, page, scroll } = state;
    if (!page) return;
    if (history) {
      writeHistory(history.href, history.key, history.replace);
      entryKey.current = history.key;
    }
    renderedPath.current = window.location.pathname;
    notifyLocationChange();
    applyHead(page);
    scrollTo(scroll ?? 0);
    clearRootPending();
  }, [state]);

  // The likeliest next pages of the shown page, e.g. the neighbours of a song.
  useEffect(() => {
    const paths = state.page && getPrefetchPaths ? getPrefetchPaths(state.page) : [];
    if (!paths.length) return;

    const timer = setTimeout(() => {
      paths.forEach((path) => {
        const route = parsePath(new URL(path, window.location.href).pathname);
        if (route) prefetchRoute(route);
      });
    }, PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, getPrefetchPaths]);

  return { isFailed, isLoading, page: state.page };
}

/** Whether `page` is the one the document was rendered with (server-only extras belong to it). */
export function isInitialPage(page: TPageData, initial: TPageData | null): boolean {
  return !!initial && getRoutePath(page.route) === getRoutePath(initial.route);
}

/** Shows the content the inline script of the root page has hidden. */
function clearRootPending(): void {
  document.documentElement.removeAttribute(ROOT_PENDING_ATTR);
}

/** URL of a left click on an internal app link, or `null` to let the browser handle it. */
function getAppLinkUrl(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return null;
  }

  const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return null;

  const url = new URL(link.href);
  return url.origin === window.location.origin && parsePath(url.pathname) ? url : null;
}

/**
 * Next's patched history methods add their own keys to our state object and
 * update `usePathname`.
 */
function writeHistory(href: string, key: string, replace: boolean): void {
  const state = { [KEY]: key };
  if (replace) window.history.replaceState(state, '', href);
  else window.history.pushState(state, '', href);
}

/**/
function ensureEntryKey(): string {
  const current = window.history.state?.[KEY] as string | undefined;
  if (current) return current;

  const key = newKey();
  window.history.replaceState({ ...window.history.state, [KEY]: key }, '');
  return key;
}

/**/
function newKey(): string {
  return Math.random().toString(36).slice(2);
}

/** The page scrolls inside `.Layout__content`, not the window. */
function getScroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.Layout__content');
}

/**/
function scrollTo(target: TScrollTarget): void {
  if (typeof target === 'string') {
    const el = document.getElementById(decodeURIComponent(target.slice(1)));
    if (el) {
      el.scrollIntoView();
      return;
    }
  }

  const scroller = getScroller();
  if (scroller) scroller.scrollTop = typeof target === 'number' ? target : 0;
}
