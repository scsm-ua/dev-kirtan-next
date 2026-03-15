// Minimal service worker for PWA with offline support

// DEBUG: Set to true to skip pre-caching (runtime caching only)
const DEBUG_MODE = false;

const CACHE_NAME = 'kirtan-v2';

// Install event - pre-cache all pages from sitemap
self.addEventListener('install', (event) => {
  if (DEBUG_MODE) {
    console.log('🔧 DEBUG MODE: Skipping pre-cache, using runtime caching only');
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    fetch('/sitemap.xml')
      .then(response => response.text())
      .then(xml => {
        // Parse sitemap XML to extract URLs
        const urlMatches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
        const urls = Array.from(urlMatches, match => {
          // Convert absolute URLs to relative paths
          const url = new URL(match[1]);
          return url.pathname;
        });
        
        // Add homepage and ensure uniqueness
        const uniqueUrls = [...new Set(['/', ...urls])];
        
        console.log(`📦 Pre-caching ${uniqueUrls.length} pages...`);
        return caches.open(CACHE_NAME)
          .then(cache => cache.addAll(uniqueUrls))
          .then(() => {
            // Calculate total cache size
            return caches.open(CACHE_NAME).then(cache => {
              return cache.keys().then(requests => {
                return Promise.all(
                  requests.map(req => cache.match(req))
                ).then(responses => {
                  let totalBytes = 0;
                  responses.forEach(response => {
                    if (response && response.headers.has('content-length')) {
                      totalBytes += parseInt(response.headers.get('content-length'), 10);
                    }
                  });
                  const totalKB = (totalBytes / 1024).toFixed(2);
                  console.log(`✅ Cached ${uniqueUrls.length} pages (${totalKB} KB)`);
                });
              });
            });
          });
      })
      .catch(err => {
        console.warn('⚠️  Pre-caching failed, falling back to runtime caching', err);
      })
      .finally(() => self.skipWaiting())
  );
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

// Fetch event - cache first for static assets, network first for HTML
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // For HTML pages: Network first, fall back to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((cached) => {
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
