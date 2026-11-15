// The service worker passes non-GET requests to the network (see public/sw.js).
const PROBE_URL = '/sw.js';
const PROBE_TIMEOUT_MS = 5000;
const RETRY_MS = 10000;

const listeners = new Set<() => void>();
let isOnline = true;
let isStarted = false;
let checkId = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

/**/
function setOnline(value: boolean): void {
  if (value === isOnline) return;
  isOnline = value;
  listeners.forEach((listener) => listener());
}

/** Any answer from the origin, whatever its status, means the network works. */
async function probe(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(PROBE_URL, { cache: 'no-store', method: 'HEAD', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Re-evaluates connectivity; call it when a network request fails.
 * `navigator.onLine` is trusted only when `false`: it stays `true` without
 * internet access and on documents loaded under DevTools offline emulation.
 */
export async function checkConnectivity(): Promise<void> {
  const id = ++checkId;
  clearTimeout(retryTimer);

  const value = navigator.onLine && (await probe());
  if (id !== checkId) return;  // Superseded by a newer check.

  setOnline(value);
  // No browser event is guaranteed when the connection returns.
  if (!value && document.visibilityState === 'visible') {
    retryTimer = setTimeout(checkConnectivity, RETRY_MS);
  }
}

/**/
function start(): void {
  if (isStarted) return;
  isStarted = true;

  window.addEventListener('online', () => checkConnectivity());
  window.addEventListener('offline', () => checkConnectivity());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkConnectivity();
  });
  checkConnectivity();
}

/** Store API for `useSyncExternalStore`; watching starts with the first subscriber. */
export function subscribeConnectivity(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

/**/
export function getIsOnline(): boolean {
  return isOnline;
}
