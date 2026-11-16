// Minimal service worker for PWA with offline support

// `v` is the build id: each build gets its own cache, older ones are deleted on activate.
const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_NAME = `kirtan-${SW_VERSION}`;

// Offline document for app pages without cached HTML; renders from cached page data.
const SHELL_PATH = '/shell/';

// Local builds are rebuilt in place, so prefer the network there.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(self.location.hostname);

// Install event
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
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
    event.respondWith(IS_LOCAL ? networkFirst(request) : cacheFirst(request));
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

  // Dev chunks keep their URL across rebuilds, so localhost prefers the network.
  if (IS_LOCAL) {
    event.respondWith(networkFirst(request));
    return;
  }

  // For static assets (JS, CSS, images): Cache first, fall back to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Caches a successful response under `request` (or its URL).
async function remember(request, response) {
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirst(request) {
  return (await caches.match(request)) || remember(request, await fetch(request));
}

async function networkFirst(request) {
  try {
    return await remember(request, await fetch(request));
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

/**
 * Stores every page of a songbook from its bundle under the pages' own data
 * URLs, plus the offline shell and the assets it loads.
 */
async function precacheBook({ bundleUrl, shellUrl }) {
  const cache = await caches.open(CACHE_NAME);

  const response = await fetch(bundleUrl, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Bundle ${response.status}`);
  const bundle = await response.json();
  await Promise.all(
    Object.entries(bundle.pages).map(([dataUrl, page]) =>
      cache.put(
        dataUrl,
        new Response(JSON.stringify(page), { headers: { 'Content-Type': 'application/json' } })
      )
    )
  );

  const shell = await fetch(shellUrl, { cache: 'no-cache' });
  if (!shell.ok) throw new Error(`Shell ${shell.status}`);
  const html = await shell.clone().text();
  await cache.put(shellUrl, shell);

  const assets = new Set(html.match(/\/_next\/static\/[^"'\s)]+\.(?:js|css)/g) || []);
  await Promise.all(
    [...assets].map(async (asset) => {
      if (!(await cache.match(asset))) await remember(asset, await fetch(asset));
    })
  );
}

// Message from the app: { type: 'PRECACHE_BOOK', bundleUrl, shellUrl }; replies { ok } on the port.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PRECACHE_BOOK') return;
  const [port] = event.ports;
  event.waitUntil(
    precacheBook(event.data).then(
      () => port?.postMessage({ ok: true }),
      (error) => port?.postMessage({ ok: false, error: String(error) })
    )
  );
});
