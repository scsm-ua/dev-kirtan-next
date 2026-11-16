import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TFetch = (url: string, init: RequestInit) => Promise<Response>;

const RETRY_MS = 10000;
const PROBE_TIMEOUT_MS = 5000;

let fetchMock: ReturnType<typeof vi.fn<TFetch>>;
let removeListeners: Array<() => void>;

const online = async () => new Response('', { status: 200 });
const offline = async () => {
  throw new TypeError('Failed to fetch');
};
const flush = () => vi.advanceTimersByTimeAsync(0);

/** The store keeps its state in the module, so every test loads a fresh copy. */
async function loadConnectivity() {
  vi.resetModules();
  return import('@/other/connectivity');
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn<TFetch>(online);
  vi.stubGlobal('fetch', fetchMock);

  // Every module copy adds window and document listeners: remove them after the test.
  removeListeners = [];
  for (const target of [window, document]) {
    const add: EventTarget['addEventListener'] = target.addEventListener.bind(target);
    vi.spyOn(target, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        removeListeners.push(() => target.removeEventListener(type, listener));
        add(type, listener);
      }
    );
  }
});

afterEach(() => {
  removeListeners.forEach((remove) => remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('connectivity', () => {
  it('assumes online and asks nothing until someone subscribes', async () => {
    const { getIsOnline } = await loadConnectivity();

    expect(getIsOnline()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('probes the origin with a HEAD request that skips the cache', async () => {
    const { subscribeConnectivity } = await loadConnectivity();

    subscribeConnectivity(() => {});
    await flush();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('/sw.js');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store', method: 'HEAD' });
  });

  it('tells subscribers when the probe fails', async () => {
    const { getIsOnline, subscribeConnectivity } = await loadConnectivity();
    const listener = vi.fn();
    fetchMock.mockImplementation(offline);

    subscribeConnectivity(listener);
    await flush();

    expect(getIsOnline()).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('does not notify when nothing changed', async () => {
    const { subscribeConnectivity } = await loadConnectivity();
    const listener = vi.fn();

    subscribeConnectivity(listener);
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  it('takes any answer of the server as online', async () => {
    const { checkConnectivity, getIsOnline } = await loadConnectivity();
    fetchMock.mockImplementationOnce(offline);
    await checkConnectivity();

    fetchMock.mockImplementationOnce(async () => new Response('', { status: 500 }));
    await checkConnectivity();

    expect(getIsOnline()).toBe(true);
  });

  it('trusts the browser when it says offline, without a request', async () => {
    const { checkConnectivity, getIsOnline } = await loadConnectivity();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    await checkConnectivity();

    expect(getIsOnline()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps probing every 10 seconds while offline, and stops when back online', async () => {
    const { getIsOnline, subscribeConnectivity } = await loadConnectivity();
    const listener = vi.fn();
    fetchMock.mockImplementation(offline);

    subscribeConnectivity(listener);
    await flush();
    await vi.advanceTimersByTimeAsync(RETRY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockImplementation(online);
    await vi.advanceTimersByTimeAsync(RETRY_MS);
    expect(getIsOnline()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(RETRY_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not keep probing in a hidden tab', async () => {
    const { checkConnectivity } = await loadConnectivity();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fetchMock.mockImplementation(offline);

    await checkConnectivity();
    await vi.advanceTimersByTimeAsync(RETRY_MS * 3);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    ['the browser goes offline', () => window.dispatchEvent(new Event('offline'))],
    ['the browser comes online', () => window.dispatchEvent(new Event('online'))],
    ['the tab becomes visible', () => document.dispatchEvent(new Event('visibilitychange'))]
  ])('probes again when %s', async (_name, trigger) => {
    const { subscribeConnectivity } = await loadConnectivity();
    subscribeConnectivity(() => {});
    await flush();

    trigger();
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up on a probe that gets no answer in 5 seconds', async () => {
    const { checkConnectivity, getIsOnline } = await loadConnectivity();
    fetchMock.mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })
    );

    const check = checkConnectivity();
    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);
    await check;

    expect(getIsOnline()).toBe(false);
  });

  it('ignores the result of a check that a newer one replaced', async () => {
    const { checkConnectivity, getIsOnline } = await loadConnectivity();
    let answerFirst: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)));
    fetchMock.mockImplementationOnce(offline);

    const first = checkConnectivity();
    await checkConnectivity();
    answerFirst(new Response(''));
    await first;

    expect(getIsOnline()).toBe(false);
  });

  it('stops telling a subscriber that left', async () => {
    const { checkConnectivity, subscribeConnectivity } = await loadConnectivity();
    const listener = vi.fn();
    const unsubscribe = subscribeConnectivity(listener);
    await flush();

    unsubscribe();
    fetchMock.mockImplementation(offline);
    await checkConnectivity();

    expect(listener).not.toHaveBeenCalled();
  });
});
