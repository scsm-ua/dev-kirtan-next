// Minimal service worker for PWA with offline support

const CACHE_NAME = 'kirtan-2026-03-29-v11';

// Runtime cache for sitemap URLs (avoids refetching on language change)
let sitemapUrlsCache = null;

// Track languages currently being cached (prevents duplicate caching)
const cachingInProgress = new Set();

// =============================================================================
// CACHE STATUS MANAGEMENT
// =============================================================================

// Get caching status for a language from cache
async function getCacheStatus(lang) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const statusUrl = `/__cache_status__/${lang}.json`;
    const response = await cache.match(statusUrl);
    if (response) {
      const status = await response.json();
      // Check TTL: 7 days (in ms)
      const now = Date.now();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (status.created_at && now - status.created_at > weekMs) {
        // Remove expired status
        await cache.delete(statusUrl);
        console.log(`🗑️  Removed expired cache status for ${lang}`);
        return null;
      }
      return status;
    }
  } catch (err) {
    console.error('Error reading cache status:', err);
  }
  return null;
}

// Save caching status for a language to cache
async function saveCacheStatus(lang, status) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const statusUrl = `/__cache_status__/${lang}.json`;
    const response = new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(statusUrl, response);
  } catch (err) {
    console.error('Error saving cache status:', err);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Extract language slug from URL (e.g., /en/... -> 'en')
function getLanguageFromUrl(url) {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/^\/([^\/]+)/);
  return match ? match[1] : null;
}

// Load all URLs from sitemap (with runtime caching)
async function loadSitemapUrls() {
  // Return cached URLs if already loaded
  if (sitemapUrlsCache) {
    return sitemapUrlsCache;
  }
  
  const response = await fetch('/sitemap.xml');
  const xml = await response.text();
  const urlMatches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  
  const urls = Array.from(urlMatches, match => {
    const url = new URL(match[1]);
    return url.pathname;
  });
  
  // Cache in memory for subsequent calls
  sitemapUrlsCache = urls;
  console.log(`✅ Loaded ${urls.length} URLs from sitemap`);
  
  return urls;
}

// Filter sitemap URLs by language
function filterUrlsByLanguage(urls, lang) {
  if (!lang) return urls;
  
  return urls.filter(url => {
    const urlLang = getLanguageFromUrl(location.origin + url);
    return urlLang === lang;
  });
}

// Cache all URLs for a specific language with granular progress tracking
async function cacheLanguageUrls(lang, status) {
  console.log(`🌐 Caching all pages for language: ${lang}`);
  
  // Mark as in progress
  cachingInProgress.add(lang);
  
  try {
    let urlsToProcess;
    let totalPages;
    
    if (status && (status.status === 'in-progress' || status.status === 'failed')) {
      // Resume from previous attempt (whether it was in-progress or failed)
      urlsToProcess = status.urlsToProcess;
      totalPages = status.totalPages;
      const cached = totalPages - urlsToProcess.length;
      console.log(`🔄 Resuming caching for ${lang} (${cached}/${totalPages} cached)`);
    } else {
      // Start fresh
      const allUrls = await loadSitemapUrls();
      urlsToProcess = filterUrlsByLanguage(allUrls, lang);
      totalPages = urlsToProcess.length;
      
      console.log(`📦 Starting to cache ${totalPages} pages for ${lang}...`);
      
      // Initialize status
      await saveCacheStatus(lang, {
        language: lang,
        status: 'in-progress',
        totalPages,
        urlsToProcess,
        created_at: Date.now()
      });
    }
    
    const cache = await caches.open(CACHE_NAME);
    // Cache URLs one by one with progress updates
    for (let i = 0; i < urlsToProcess.length; i++) {
      const url = urlsToProcess[i];
      try {
        await cache.add(url);
      } catch (err) {
        console.warn(`Failed to cache ${url}:`, err.message);
      }
      // Update status after each URL (so progress is never lost)
      const remaining = urlsToProcess.slice(i + 1);
      await saveCacheStatus(lang, {
        language: lang,
        status: 'in-progress',
        totalPages,
        urlsToProcess: remaining,
        created_at: status?.created_at || Date.now()
      });
      // Log only every 20 URLs to avoid console clutter
      if ((i + 1) % 20 === 0) {
        const cached = totalPages - remaining.length;
        console.log(`⏳ Progress for ${lang}: ${cached}/${totalPages} cached`);
      }
    }
    // Mark as completed
    await saveCacheStatus(lang, {
      language: lang,
      status: 'completed',
      totalPages,
      urlsToProcess: [],
      created_at: status?.created_at || Date.now()
    });
    
    console.log(`✅ Cached all ${totalPages} pages for ${lang}`);
  } catch (err) {
    console.error(`❌ Failed to cache language ${lang}:`, err);
    
    // Mark as failed (keep remaining URLs if available)
    await saveCacheStatus(lang, {
      language: lang,
      status: 'failed',
      totalPages: totalPages || 0,
      urlsToProcess: urlsToProcess || [],
      created_at: status?.created_at || Date.now()
    });
  } finally {
    // Always remove from in-progress tracking
    cachingInProgress.delete(lang);
  }
}

// =============================================================================
// SERVICE WORKER EVENTS
// =============================================================================

// Install event - just skip waiting, no pre-caching
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log(`🗑️  Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
      console.log('🔄 Service worker activated.');    
      self.clients.claim();
    })()
  );
});

// Message event - listen for commands from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_ALL_BY_LANGUAGE') {
    
    const url = event.data.url;
    const lang = getLanguageFromUrl(url);
    
    if (!lang) {
      console.log('⚠️  No language detected in URL:', url);
      return;
    }
    
    // Check caching status
    (async () => {
      // Check if already caching this language
      if (cachingInProgress.has(lang)) {
        console.log(`⏳ Caching for ${lang} already in progress, skipping`);
        return;
      }
      
      let status = await getCacheStatus(lang);
      
      if (!status) {
        // No status - start fresh (pass null to avoid re-fetching)
        console.log(`🆕 Starting fresh caching for ${lang}`);
        await cacheLanguageUrls(lang, null);
      } else if (status.status === 'completed') {
        // Already completed, skip further caching
        console.log(`✅ Language ${lang} already fully cached (${status.totalPages} pages)`);
      } else if (status.status === 'in-progress') {
        // Resume incomplete caching
        console.log(`🔄 Resuming incomplete caching for ${lang}`);
        await cacheLanguageUrls(lang, status);
      } else if (status.status === 'failed') {
        // Retry failed caching
        console.log(`♻️  Retrying failed caching for ${lang}`);
        await cacheLanguageUrls(lang, status);
      }
    })();
  }
});

// Helper: Normalize URL by removing query parameters for HTML pages
function normalizeUrl(url) {
  const urlObj = new URL(url);
  urlObj.search = ''; // Remove query parameters
  // Ensure trailing slash (Next.js trailingSlash: true)
  if (!urlObj.pathname.endsWith('/')) {
    urlObj.pathname = urlObj.pathname + '/';
  }
  return urlObj.href;
}

// Helper: Normalize URL for static assets (remove query params for cache busting)
function normalizeStaticUrl(url) {
  return url;
  // const urlObj = new URL(url);
  // urlObj.search = ''; // Remove query parameters
  // return urlObj.href;
}

// Helper: Generate offline page response
function createOfflineResponse() {
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
}

// Helper: Fetch and cache resource (HTML or static asset)
async function fetchAndCache(request, cacheUrl) {
  // If request is null, create a GET request for cacheUrl
  let req = request;
  if (!req) {
    req = new Request(cacheUrl, { method: 'GET' });
  }
  const response = await fetch(req);
  if (response.ok && req.method === 'GET') {
    const responseClone = response.clone();
    caches.open(CACHE_NAME).then((cache) => {
      cache.put(cacheUrl, responseClone);
    });
  }
  return response;
}

// Fetch event - handle requests and cache responses
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // For HTML pages: Network first, fall back to cache, then offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    const normalizedUrl = normalizeUrl(request.url);
    event.respondWith(
      fetchAndCache(request, normalizedUrl)
        .then((response) => {
          // If network fetch fails, response will be undefined/null
          if (response && response.ok) {
            return response;
          }
          // Try cache if network fails
          return caches.match(normalizedUrl);
        })
        .catch(() => createOfflineResponse())
    );
    return;
  }

  // For static assets (JS, CSS, images): Cache first, fall back to network
  // Cache without query params to handle cache busting (e.g., bundle.js?v=123)
  const normalizedUrl = normalizeStaticUrl(request.url);
  event.respondWith(
    caches.match(normalizedUrl).then((cached) => {
      if (cached) {
        // Return cached version immediately, update in background
        fetchAndCache(request, normalizedUrl).catch(() => {});
        return cached;
      }
      
      // Not in cache, fetch from network
      return fetchAndCache(request, normalizedUrl);
    })
  );
});
