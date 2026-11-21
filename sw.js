// Minimal service worker for PWA with offline support.
// Offline strategy, messages and cache layout: .github/instructions/offline-mode.instructions.md.

// `v` is the build id: each build gets its own cache, older ones are deleted on activate.
const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_NAME = `kirtan-${SW_VERSION}`;

// Offline document for app pages without cached HTML; renders from cached page data.
const SHELL_PATH = '/shell/';
// Lists of the logos and covers of all songbooks (built file, not stored): cached on install.
const SHARED_ASSETS_PATH = '/shell/assets.json';

// `/data/<book>/<file>`: captures the book id.
const DATA_PATH_RE = /^\/data\/([\w-]+)\//;
// JS and CSS of the app, as referenced in its HTML.
const ASSET_RE = /\/_next\/static\/[^"'\s)]+\.(?:js|css)/g;
// Files (icon font) referenced in the app's CSS.
const CSS_MEDIA_RE = /url\(["']?(\/_next\/static\/media\/[^"')\s]+)["']?\)/g;
// Covers and thumbnails come in two densities: `x.jpg` and `x@2.jpg`.
const DENSITY_IMAGE_RE = /^\/images\/(?:cover|thumbnail)\//;

// Name of a status record, next to the page data. Not a file of the site.
const STATUS_RECORD_FILE = 'cache-status.json';
// The record of the files every book shares: app files, logos and covers.
const SHARED_RECORD_URL = `/data/${STATUS_RECORD_FILE}`;

// Images fetched at the same time by the book job.
const IMAGE_CONCURRENCY = 4;
// Rounds of "list the shell files, fetch the missing ones" on install: JS/CSS → font.
const SHELL_PASSES = 2;
// A page came from the network and its book is not cached: the book job starts after this delay.
const BOOK_JOB_DELAY_MS = 2000;
// After a failed job, data requests start no new job for this long.
const BOOK_JOB_RETRY_MS = 60000;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Main events of the worker in the console of the site's pages (DevTools → Console, also the worker's own). */
function log(...args) {
  console.log(`[sw ${SW_VERSION}]`, ...args);
}
function logError(...args) {
  console.warn(`[sw ${SW_VERSION}]`, ...args);
}

// Install event - cache the shell, so an active worker always has one
self.addEventListener('install', (event) => {
  log('install: caching the shell');
  event.waitUntil(
    installShell()
      .then(({ files, images }) =>
        log(`install: shell cached (${files.length} files), logos and covers ${images ? formatCounts({ images }) : 'skipped'}`)
      )
      .then(() => self.skipWaiting())
      .catch((error) => {
        logError('install failed, the browser retries on the next page load:', String(error));
        throw error;
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const old = cacheNames.filter((cacheName) => cacheName !== CACHE_NAME);
      log(old.length ? `activate: deleting old caches ${old.join(', ')}` : 'activate');
      return Promise.all(old.map((cacheName) => caches.delete(cacheName)));
    })
  );
  self.clients.claim();
});

// Helper: Normalize URL by removing query parameters for HTML pages
function normalizeUrl(url) {
  const urlObj = new URL(url);
  // Remove query parameters (e.g., ?p=1)
  urlObj.search = '';
  // Ensure trailing slash (Next.js trailingSlash: true)
  if (!urlObj.pathname.endsWith('/')) {
    urlObj.pathname = urlObj.pathname + '/';
  }
  return urlObj.href;
}

// Fetch event - cache first for static assets, network first for HTML
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Only GET is cacheable; the rest (e.g. the HEAD connectivity probe) goes to the network.
  if (request.method !== 'GET') {
    return;
  }

  // Page data (JSON) is immutable within a build.
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(respondData(event, url));
    return;
  }

  if (url.pathname.startsWith('/images/')) {
    event.respondWith(respondImage(event, url));
    return;
  }

  // For HTML pages: Network first, fall back to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    // Normalize URL for caching (remove query params)
    const normalizedUrl = normalizeUrl(request.url);
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses using normalized URL
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Cache API accepts URL strings directly
              cache.put(normalizedUrl, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try the cached page, then the app shell
          return caches.match(normalizedUrl)
            .then((cached) => cached || caches.match(SHELL_PATH))
            .then((cached) => {
            if (cached) {
              return cached;
            }
            // Page not cached - return offline message
            return new Response(
              `<!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Offline</title>
                  <style>
                    body {
                      font-family: system-ui, -apple-system, sans-serif;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 100vh;
                      margin: 0;
                      background: #f5f5f5;
                    }
                    .container {
                      text-align: center;
                      padding: 2rem;
                    }
                    h1 { color: #333; margin-bottom: 1rem; }
                    p { color: #666; margin: 0.5rem 0; }
                    .back-button {
                      display: inline-block;
                      margin-top: 1.5rem;
                      padding: 0.75rem 1.5rem;
                      background: #007bff;
                      color: white;
                      text-decoration: none;
                      border-radius: 6px;
                      font-weight: 500;
                      transition: background 0.2s;
                    }
                    .back-button:hover {
                      background: #0056b3;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>📡 You're Offline</h1>
                    <p>This page hasn't been cached yet.</p>
                    <p>Please check your connection and try again.</p>
                    <a href="javascript:history.back()" class="back-button">← Go Back</a>
                  </div>
                </body>
              </html>`,
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/html' }
              }
            );
          });
        })
    );
    return;
  }

  event.respondWith(cacheFirst(event));
});

/* Helpers --------------------------------------------------------------------- */

/** The network did not answer (offline): a job stops and keeps the last state. */
class OfflineError extends Error {}
/** The server answered with an error status (404, 5xx). */
class StatusError extends Error {}

function openCache() {
  return caches.open(CACHE_NAME);
}

/** True when the cache has an entry for `path`; the body is not read. */
async function isCached(cache, path) {
  return (await cache.keys(path, { ignoreVary: true })).length > 0;
}

/** `fetch` that throws `OfflineError` without a network and `StatusError` on a failed response. */
async function fetchOk(path, init) {
  let response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    throw new OfflineError(`${path}: ${error}`);
  }
  if (!response.ok) throw new StatusError(`${path}: ${response.status}`);
  return response;
}

/**
 * Fetches a file and caches it under its path. For fetches the worker starts
 * itself (install, book job): they do not pass its `fetch` handler.
 */
async function fetchAndStore(cache, path, init) {
  const response = await fetchOk(path, init);
  await cache.put(path, response);
}

/** `fetchAndStore` only when the cache has no entry for `path` (one key lookup). */
async function fetchAndStoreMissing(cache, path, init) {
  if (!(await isCached(cache, path))) await fetchAndStore(cache, path, init);
}

/**
 * Caches a successful response of a fetch handler after the response went
 * out; a failed store (quota) never fails the response.
 */
function storeInBackground(event, key, response) {
  if (!response.ok) return;
  const copy = response.clone();
  event.waitUntil(
    openCache()
      .then((cache) => cache.put(key, copy))
      .catch(() => {})
  );
}

/* Fetch strategies ---------------------------------------------------------- */

async function cacheFirst(event) {
  const { request } = event;
  const cached = await caches.match(request);
  if (cached) return cached;

  let response;
  try {
    response = await fetch(request);
  } catch (error) {
    logError(`cacheFirst: not cached and fetch failed: ${request.url}`, error);
    throw error;
  }
  storeInBackground(event, request, response);
  return response;
}

/**
 * Images: cache → network. When both miss, a cover or thumbnail in the other
 * density is better than a broken image (`srcset` picks a density by its own
 * rules).
 */
async function respondImage(event, url) {
  const { request } = event;
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    storeInBackground(event, request, response);
    return response;
  } catch (error) {
    const other = getOtherDensity(url.pathname);
    const fallback = other && (await caches.match(other, { ignoreVary: true }));
    if (fallback) return fallback;
    throw error;
  }
}

/** `x.jpg` ↔ `x@2.jpg` for covers and thumbnails; `null` for other images. */
function getOtherDensity(path) {
  if (!DENSITY_IMAGE_RE.test(path)) return null;
  return path.includes('@2.') ? path.replace('@2.', '.') : path.replace(/\.(\w+)$/, '@2.$1');
}

/* Page data ------------------------------------------------------------------- */

/**
 * Page data: the page entry → the bundle of its book (memory, then cache) →
 * the network. A page from the bundle is not written as a page entry: the
 * bundle is the store. A page from the network is stored, and starts the
 * book job (after a delay) when the bundle is not cached.
 */
async function respondData(event, url) {
  const { request } = event;
  const path = url.pathname;
  const bookId = path.match(DATA_PATH_RE)?.[1];

  // The status records are not files of the site: answered from the cache only
  // (open one in the browser to debug), 404 when there is none.
  if (path === SHARED_RECORD_URL || (bookId && path === getStatusRecordUrl(bookId))) {
    return (await caches.match(path)) || new Response(null, { status: 404 });
  }
  // Data outside a book: as any other file.
  if (!bookId) return cacheFirst(event);

  const cached = (await getPageEntryFromCache(path)) || (await getPageEntryFromBundle(bookId, path));
  if (cached) return cached;

  // Not cached: from the network. When offline, the fetch rejects and the router shows the offline note.
  const response = await getPageEntryFromNet(request);
  if (response.ok) event.waitUntil(afterPageFromNet(bookId, path, response.clone()));
  return response;
}

/** Stores a page that came from the network; without a bundle of its book, schedules the book job. */
async function afterPageFromNet(bookId, path, response) {
  const isStored = await storePageEntryInCache(path, response);
  if (isStored && !getBundleFromMemory(bookId)) await scheduleBook(bookId);
}

/** 1. The page from the network; nothing is stored. */
function getPageEntryFromNet(request) {
  return fetch(request);
}

/** 2. The page entry of the cache, or `undefined`. */
function getPageEntryFromCache(path) {
  return caches.match(path);
}

/**
 * 3. Stores a page that came from the network; never throws. A page of
 * another build is not stored (the router rejects it and reloads): a newer
 * deploy is live. Resolves with `true` when the page is of this build.
 */
async function storePageEntryInCache(path, response) {
  if (!response.ok) return false;
  try {
    const page = await response.clone().json();
    if (page.build !== SW_VERSION) {
      setOutdated(page.build);
      return false;
    }
  } catch {
    return false;
  }
  try {
    const cache = await openCache();
    await cache.put(path, response);
  } catch {
    // The store failed (quota): the response already went out.
  }
  return true;
}

/** 9. The page from the bundle of its book (no network); `null` without a bundle or without such a page. */
async function getPageEntryFromBundle(bookId, path) {
  const bundle = await loadBundle(bookId);
  const page = bundle?.pages[path];
  return page ? new Response(JSON.stringify(page), { headers: JSON_HEADERS }) : null;
}

/* Bundles --------------------------------------------------------------------- */

/** Parsed bundles of the books used in this worker life, by book id. */
const bundles = new Map();
/** Running reads of a bundle from the cache, by book id: a burst of requests parses it once. */
const bundleReads = new Map();

function getBundleUrl(bookId) {
  return `/data/${bookId}/bundle.json`;
}

/** 4. The bundle from the network, parsed and as a blob to store. */
async function getBundleFromNet(bookId) {
  const response = await fetchOk(getBundleUrl(bookId), { cache: 'no-cache' });
  const blob = await response.blob();
  return { blob, bundle: JSON.parse(await blob.text()) };
}

/** 5. The bundle from the cache, or `null`. */
async function getBundleFromCache(bookId) {
  const response = await (await openCache()).match(getBundleUrl(bookId));
  return response ? response.json() : null;
}

/** 6. The bundle from memory, or `null`. */
function getBundleFromMemory(bookId) {
  return bundles.get(bookId) || null;
}

/** 7. */
async function storeBundleInCache(bookId, blob) {
  await (await openCache()).put(getBundleUrl(bookId), new Response(blob, { headers: JSON_HEADERS }));
}

/** 8. Other books stay in memory. */
function storeBundleInMemory(bookId, bundle) {
  bundles.set(bookId, bundle);
}

/** The bundle without the network: memory → cache → store in memory. One read per book at a time. */
function loadBundle(bookId) {
  const bundle = getBundleFromMemory(bookId);
  if (bundle) return Promise.resolve(bundle);

  let read = bundleReads.get(bookId);
  if (!read) {
    read = getBundleFromCache(bookId)
      .then((cached) => {
        if (cached) storeBundleInMemory(bookId, cached);
        return cached;
      })
      .catch(() => null)
      .finally(() => bundleReads.delete(bookId));
    bundleReads.set(bookId, read);
  }
  return read;
}

/* Shell ----------------------------------------------------------------------- */

/**
 * Files the app needs to start offline, read from the cache only: `/shell/`,
 * the JS/CSS it references and the fonts referenced in that CSS. The root
 * page `/` (`start_url` of the manifest) is not one of them: offline the
 * shell renders it, as any other app page.
 * A file that is not cached yet cannot be read for its references.
 */
async function listShellFiles(cache) {
  const files = new Set([SHELL_PATH]);
  const styles = new Set();

  const shell = await cache.match(SHELL_PATH);
  if (shell) {
    for (const asset of (await shell.text()).match(ASSET_RE) || []) {
      // Store all cached files paths.
      files.add(asset);
      if (asset.endsWith('.css')) styles.add(asset);
    }
  }
  for (const style of styles) {
    const response = await cache.match(style);
    if (!response) continue;
    // Read icons etc paths from css.
    for (const [, media] of (await response.text()).matchAll(CSS_MEDIA_RE)) files.add(media);
  }

  return [...files];
}

/**
 * 12. Caches the shell and the logos and covers of all songbooks when the
 * worker installs, and writes their lists into the shared record: the book
 * job checks them from there. A failed shell file, or no network, fails the
 * install: the browser drops this worker and tries again on the next page
 * load, and the old worker with its cache keeps working. A failed image stays
 * `missing`, and the book job tries it again.
 */
async function installShell() {
  const cache = await openCache();
  const files = await cacheShell(cache);
  const images = await cacheSharedImages(cache);
  await storeStatusRecord(SHARED_RECORD_URL, { appFiles: { files, missing: [] }, images });
  return { files, images };
}

/** Logos and covers of all songbooks, from `/shell/assets.json` (not stored). */
async function getSharedImagesFromNet() {
  const { bookImages, shell } = await (await fetchOk(SHARED_ASSETS_PATH, { cache: 'no-cache' })).json();
  return [...new Set([...shell, ...bookImages])];
}

/**
 * Install: caches the logos and covers. Resolves with `{ files, missing }`,
 * or `null` when the list answers with an error status (the first book job
 * reads it again).
 */
async function cacheSharedImages(cache) {
  let images;
  try {
    images = await getSharedImagesFromNet();
  } catch (error) {
    if (error instanceof StatusError) return null;
    throw error;
  }
  return ensureFiles(cache, images, NO_PROGRESS);
}

/** Progress of a check that reports to no page (install). */
const NO_PROGRESS = { add() {}, done() {} };

/**
 * Makes sure the shell files are cached, the page first; fetches only those
 * not in the cache (the cache is of this build, so a cached file is current).
 * Resolves with the list of all of them.
 */
async function cacheShell(cache) {
  const stored = new Set([SHELL_PATH]);
  await fetchAndStoreMissing(cache, SHELL_PATH, { cache: 'no-cache' });

  // A newly cached HTML or CSS file adds its references to the next pass.
  for (let pass = 0; pass < SHELL_PASSES; pass++) {
    const missing = (await listShellFiles(cache)).filter((file) => !stored.has(file));
    await Promise.all(missing.map((file) => fetchAndStoreMissing(cache, file)));
    missing.forEach((file) => stored.add(file));
  }

  return [...stored];
}

/* Status ---------------------------------------------------------------------- */

/** Last `caching` status of each running job that fetches something. */
const activeStatuses = new Map();

/** Key of the record of a book: `{ contentImages }`. The shared record (`SHARED_RECORD_URL`) is `{ appFiles, images }`. */
function getStatusRecordUrl(bookId) {
  return `/data/${bookId}/${STATUS_RECORD_FILE}`;
}

/**
 * 11. A status record, or `null`: the files the last check went through, in
 * groups of `{ files, missing }` (all paths, and those not in the cache after it).
 */
async function getStatusRecord(url) {
  const response = await (await openCache()).match(url);
  return response ? response.json().catch(() => null) : null;
}

/** 11. */
async function storeStatusRecord(url, record) {
  const response = new Response(JSON.stringify(record), { headers: JSON_HEADERS });
  await (await openCache()).put(url, response);
}

/** `name cached/total` of every group of a record or status, for the log. */
function formatCounts(groups) {
  return Object.entries(groups)
    .filter(([, group]) => group && typeof group === 'object' && ('total' in group || 'files' in group))
    .map(([name, group]) => {
      const { cached, total } = 'files' in group ? countFiles(group) : group;
      return `${name} ${cached}/${total}`;
    })
    .join(', ');
}

/** `cached / total` of a checked group of files. */
function countFiles({ files, missing }) {
  return { cached: files.length - missing.length, total: files.length };
}

/** Status of a book whose files were checked, from the shared record and its own. */
function getCachedStatus(bookId, shared, record) {
  return {
    bookId,
    pages: true,
    state: 'cached',
    images: countFiles(shared.images),
    contentImages: countFiles(record.contentImages)
  };
}

/**
 * State of a book as the cache has it: `pages` when the bundle is cached,
 * `cached` when a job also wrote the records (its own and the shared one).
 * One key lookup and two small reads.
 */
async function readStatus(bookId) {
  const pages = await isCached(await openCache(), getBundleUrl(bookId));
  if (pages) {
    const [record, shared] = await Promise.all([getStatusRecordUrl(bookId), SHARED_RECORD_URL].map(getStatusRecord));
    if (record && shared?.images) return getCachedStatus(bookId, shared, record);
  }
  return { bookId, pages, state: 'none' };
}

/** Sends a book's status to every page of the site, also those not controlled yet. */
async function broadcast(status) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => client.postMessage({ type: 'BOOK_CACHE_STATUS', status }));
}

/**
 * Progress of a job as finished items / all items known so far. Reports
 * `caching` only once there is something to fetch, so a job that finds
 * everything cached goes straight to `cached`.
 */
function createProgress(bookId) {
  let total = 0;
  let finished = 0;
  let pages = false;
  let lastReported = '';

  const report = () => {
    const progress = total ? Math.round((finished / total) * 100) / 100 : 0;
    const key = `${pages}:${progress}`;
    if (key === lastReported) return;
    lastReported = key;
    const status = { bookId, pages, state: 'caching', progress };
    activeStatuses.set(bookId, status);
    broadcast(status);
  };

  return {
    add(count) {
      if (!count) return;
      if (!total) log(`book ${bookId}: fetching missing files`);
      total += count;
      report();
    },
    done(count) {
      finished += count;
      report();
    },
    /** The bundle is stored: the pages of the book work offline from now on. */
    setPages() {
      pages = true;
      if (total) report();
    }
  };
}

/* Book job -------------------------------------------------------------------- */

/** Running jobs, by book id: one job per book at a time. */
const runs = new Map();
/** Books with a job that waits for its delay. */
const scheduled = new Set();
/** When the last job of a book failed, by book id. */
const failedAt = new Map();
/** A bundle or a page of a newer deploy was seen: this worker starts no more jobs. */
let isOutdated = false;
/** The running check of the shared files: jobs of several books at the same time share it. */
let sharedCheck = null;

/** A bundle or a page of build `build` came from the network: a newer deploy is live. */
function setOutdated(build) {
  if (!isOutdated) log(`newer deploy is live (${build}): no more book jobs in this worker`);
  isOutdated = true;
}

/**
 * Makes sure a list of files is cached: key lookup → missing: fetch → store,
 * a few at a time. A file that answers with an error status is skipped and
 * stays missing; without a network the whole check rejects.
 * With `isLookupOnly` nothing is fetched. Resolves with `{ files, missing }`.
 */
async function ensureFiles(cache, files, progress, isLookupOnly) {
  const found = await Promise.all(files.map((file) => isCached(cache, file)));
  const missing = new Set(files.filter((file, index) => !found[index]));
  const queue = isLookupOnly ? [] : [...missing];
  let failure = null;
  progress.add(queue.length);

  const worker = async () => {
    for (let file = queue.shift(); file && !failure; file = queue.shift()) {
      try {
        await fetchAndStore(cache, file);
        missing.delete(file);
      } catch (error) {
        if (!(error instanceof StatusError)) {
          failure = error;
          throw error;
        }
        // Stays missing; the next job tries again.
      }
      progress.done(1);
    }
  };
  await Promise.all(Array.from({ length: IMAGE_CONCURRENCY }, worker));

  return { files, missing: [...missing] };
}

/**
 * Files every book shares: the app files and the logos and covers. Both
 * lists are in the shared record since install; a missing list is made again
 * (the shell step of the install, `/shell/assets.json`). Resolves with the
 * shared record, stored.
 */
async function checkSharedFiles({ cache, progress }) {
  const last = await getStatusRecord(SHARED_RECORD_URL);
  // Without the list, or without the page it was read from: the shell step of the install again.
  const isListed = !!last && (await isCached(cache, SHELL_PATH));
  if (!isListed) log('shared files: shell list missing, caching the shell again');
  const appFiles = isListed ? last.appFiles.files : await cacheShell(cache);
  if (!last?.images) log('shared files: image list missing, reading it again');
  const images = last?.images ? last.images.files : await getSharedImagesFromNet();

  const record = {
    appFiles: await ensureFiles(cache, appFiles, progress),
    images: await ensureFiles(cache, images, progress)
  };
  await storeStatusRecord(SHARED_RECORD_URL, record);
  log('shared files checked:', formatCounts(record));
  return record;
}

/**
 * 10. Static files of a book: every job checks that each of them is in the
 * cache and fetches the missing ones. Shared files always; content images
 * are only looked up on Save-Data. Resolves with both records, stored.
 */
async function checkStaticResources(bookId, bundle, { cache, progress, storeBigImages }) {
  sharedCheck ??= checkSharedFiles({ cache, progress }).finally(() => {
    sharedCheck = null;
  });
  const shared = await sharedCheck;

  const contentImages = [...new Set(bundle.assets.contentImages)];
  const record = { contentImages: await ensureFiles(cache, contentImages, progress, !storeBigImages) };
  await storeStatusRecord(getStatusRecordUrl(bookId), record);
  return { record, shared };
}

/**
 * The book job: makes sure a songbook is cached — bundle, then static files —
 * and fetches only what is missing. One job per book at a time; later callers
 * get the running one. Resolves with the final `TBookCacheStatus`.
 * `storeBigImages` overrides the worker's own Save-Data flag.
 */
function ensureBook(bookId, options = {}) {
  let run = runs.get(bookId);
  if (!run) {
    const startedAt = Date.now();
    log(`book ${bookId}: job started`);
    run = runBookJob(bookId, options)
      .then((status) => {
        const counts = status.images ? ` (${formatCounts(status)})` : '';
        log(`book ${bookId}: ${status.state} in ${Date.now() - startedAt} ms${counts}`);
        return status;
      })
      .catch(async (error) => {
        failedAt.set(bookId, Date.now());
        const last = await readStatus(bookId).catch(() => ({ bookId, pages: false, state: 'none' }));
        // Offline: the last state stays.
        if (error instanceof OfflineError) {
          log(`book ${bookId}: job stopped, offline (state stays ${last.state})`);
          return last;
        }
        logError(`book ${bookId}: job failed:`, String(error));
        return { bookId, pages: last.pages, state: 'error', error: String(error) };
      })
      .then((status) => {
        runs.delete(bookId);
        activeStatuses.delete(bookId);
        broadcast(status);
        return status;
      });
    runs.set(bookId, run);
  }
  return run;
}

async function runBookJob(bookId, options) {
  // A newer deploy is live: the page reloads into it on its next navigation.
  if (isOutdated) {
    log(`book ${bookId}: skipped, a newer deploy is live`);
    return readStatus(bookId);
  }

  const storeBigImages = options.storeBigImages ?? !self.navigator.connection?.saveData;
  const cache = await openCache();
  const progress = createProgress(bookId);

  // A bundle that is only in memory (its entry was evicted) is fetched again.
  let bundle = (await isCached(cache, getBundleUrl(bookId))) ? await loadBundle(bookId) : null;
  if (!bundle) {
    log(`book ${bookId}: fetching the bundle`);
    progress.add(1);
    const fetched = await getBundleFromNet(bookId);
    if (fetched.bundle.build !== SW_VERSION) {
      setOutdated(fetched.bundle.build);
      return readStatus(bookId);
    }
    await storeBundleInCache(bookId, fetched.blob);
    storeBundleInMemory(bookId, fetched.bundle);
    bundle = fetched.bundle;
    progress.done(1);
  }
  progress.setPages();

  // The records are not trusted: a file deleted since the last job is fetched again.
  const { record, shared } = await checkStaticResources(bookId, bundle, { cache, progress, storeBigImages });
  failedAt.delete(bookId);

  return getCachedStatus(bookId, shared, record);
}

/**
 * Starts the book job after a delay, for a data request that found no
 * bundle. Does nothing when a job of the book runs or waits, after a newer
 * deploy was seen, or shortly after a failed job (no retry on every request
 * while the bundle answers 5xx).
 */
async function scheduleBook(bookId) {
  if (isOutdated || runs.has(bookId) || scheduled.has(bookId)) return;
  if (Date.now() - (failedAt.get(bookId) ?? -Infinity) < BOOK_JOB_RETRY_MS) return;

  scheduled.add(bookId);
  log(`book ${bookId}: page came from the network, job in ${BOOK_JOB_DELAY_MS} ms`);
  await new Promise((resolve) => setTimeout(resolve, BOOK_JOB_DELAY_MS));
  scheduled.delete(bookId);
  await ensureBook(bookId);
}

/**
 * State of the given books, from the bundle entry and the status records;
 * running jobs override. Books with nothing cached are left out. The
 * page sends the ids: the worker has no list of the songbooks.
 */
async function getCacheStatus(bookIds) {
  const books = {};
  for (const status of await Promise.all(bookIds.map(readStatus))) {
    if (status.pages) books[status.bookId] = status;
  }
  activeStatuses.forEach((status, bookId) => (books[bookId] = status));
  return { build: SW_VERSION, books };
}

/** Adds one cache entry to a group of `getBookCacheInfo`. */
function addToGroup(group, bytes) {
  group.bytes += bytes;
  group.count += 1;
}

/**
 * Details of the cache for the popup of a book, in groups of `{ bytes, count }`:
 * - `texts`: `/data/<book>/**` (bundle, page entries, its record); `pages` of the bundle;
 * - `bookImages`: content images of the book (`total`: listed in the bundle);
 * - `appImages`: other `/images/**`: logos, covers, thumbnails (`total`: listed in the shared record + cached);
 * - `appHtml`: cached HTML documents: `/shell/` and pages of every book;
 * - `appResources`: everything else: JS, CSS, fonts, the shared record.
 * `bookTotalBytes` is the book plus the app groups; `allTotalBytes` is the whole cache
 * (also data and content images of other books).
 * Cache Storage has no size API, so every body is read; asked only when the
 * reader opens the popup.
 */
async function getBookCacheInfo(bookId) {
  const cache = await openCache();
  const bundle = await loadBundle(bookId);
  const contentImages = new Set(bundle?.assets.contentImages || []);
  const listedAppImages = new Set((await getStatusRecord(SHARED_RECORD_URL))?.images?.files || []);
  const cachedAppImages = new Set();
  const empty = () => ({ bytes: 0, count: 0 });
  const groups = { texts: empty(), bookImages: empty(), appImages: empty(), appHtml: empty(), appResources: empty() };
  let allTotalBytes = 0;

  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    if (!response) continue;
    const path = new URL(request.url).pathname;
    const isHtml = (response.headers.get('Content-Type') || '').includes('text/html');
    const { size } = await response.blob();
    allTotalBytes += size;

    const dataBook = path.match(DATA_PATH_RE)?.[1];
    if (dataBook) {
      if (dataBook === bookId) addToGroup(groups.texts, size);
    } else if (path.startsWith('/images/resources/')) {
      if (contentImages.has(path)) addToGroup(groups.bookImages, size);
    } else if (path.startsWith('/images/')) {
      addToGroup(groups.appImages, size);
      cachedAppImages.add(path);
    } else if (isHtml) {
      addToGroup(groups.appHtml, size);
    } else {
      addToGroup(groups.appResources, size);
    }
  }

  const hasBundle = groups.texts.count > 0 && (await isCached(cache, getBundleUrl(bookId)));
  return {
    bookId,
    pages: hasBundle && bundle ? Object.keys(bundle.pages).length : 0,
    ...groups,
    bookImages: { ...groups.bookImages, total: contentImages.size },
    appImages: { ...groups.appImages, total: new Set([...listedAppImages, ...cachedAppImages]).size },
    bookTotalBytes: Object.values(groups).reduce((sum, group) => sum + group.bytes, 0),
    allTotalBytes
  };
}

/* Messages ------------------------------------------------------------------- */

// Requests from the app carry a MessageChannel port for the reply.
self.addEventListener('message', (event) => {
  const { data } = event;
  const [port] = event.ports;
  const reply = (promise) =>
    event.waitUntil(promise.then((result) => port?.postMessage(result)).catch(() => {}));
  const isValidId = (bookId) => typeof bookId === 'string' && /^[\w-]+$/.test(bookId);
  const isBookId = isValidId(data?.bookId);

  switch (data?.type) {
    case 'ENSURE_BOOK':
      if (!isBookId) break;
      // `storeBigImages` is optional: without it the worker's own Save-Data flag decides.
      reply(ensureBook(data.bookId, typeof data.storeBigImages === 'boolean' ? { storeBigImages: data.storeBigImages } : {}));
      break;
    case 'GET_BOOK_CACHE_INFO':
      if (isBookId) reply(getBookCacheInfo(data.bookId));
      break;
    case 'GET_CACHE_STATUS':
      reply(getCacheStatus(Array.isArray(data.bookIds) ? data.bookIds.filter(isValidId) : []));
      break;
  }
});
