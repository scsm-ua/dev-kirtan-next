import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TWindow = Window & { dataLayer?: ArrayLike<unknown>[]; isGaInit?: boolean };

const GA_ID = 'G-TEST';
const w = window as TWindow;

/** The id is read when the module loads, so every test loads a fresh copy. */
async function loadAnalytics(gaId: string) {
  vi.stubEnv('NEXT_PUBLIC_G_ID', gaId);
  vi.resetModules();
  return import('@/other/analytics');
}

/** Data layer entries as plain arrays. */
const getEntries = () => (w.dataLayer ?? []).map((entry) => Array.from(entry));

describe('analytics', () => {
  beforeEach(() => {
    delete w.dataLayer;
    delete w.isGaInit;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does nothing without a Google Analytics id', async () => {
    const { trackEvent, trackPage } = await loadAnalytics('');

    trackPage({ bookId: 'en' });
    trackEvent('player_start');

    expect(w.dataLayer).toBeUndefined();
  });

  it('configures Google Analytics on the first page, which sends its own page view', async () => {
    const { trackPage } = await loadAnalytics(GA_ID);

    trackPage({ bookId: 'en', itemId: 'some-song', pageType: 'song' });

    expect(getEntries()).toEqual([
      ['js', expect.any(Date)],
      ['config', GA_ID, { songbook: 'en', page_type: 'song', item_id: 'some-song' }]
    ]);
  });

  it('sends an explicit page view with the new URL and title on later pages', async () => {
    const { trackPage } = await loadAnalytics(GA_ID);
    trackPage({ bookId: 'en', pageType: 'contents' });
    window.history.replaceState(null, '', '/en/some-song/');
    document.title = 'Some Song';

    trackPage({ bookId: 'en', itemId: 'some-song', pageType: 'song' });

    expect(getEntries().slice(2)).toEqual([
      ['config', GA_ID, { songbook: 'en', page_type: 'song', item_id: 'some-song', send_page_view: false }],
      ['event', 'page_view', { page_location: window.location.href, page_title: 'Some Song' }]
    ]);
  });

  it('sends custom events with their params', async () => {
    const { trackEvent } = await loadAnalytics(GA_ID);

    trackEvent('player_start', { singer: 'Singer' });
    trackEvent('other_event');

    expect(getEntries()).toEqual([
      ['event', 'player_start', { singer: 'Singer' }],
      ['event', 'other_event', {}]
    ]);
  });

  it('pushes `arguments` objects, the only form gtag.js understands', async () => {
    const { trackEvent } = await loadAnalytics(GA_ID);

    trackEvent('player_start');

    expect(Object.prototype.toString.call(w.dataLayer[0])).toBe('[object Arguments]');
  });
});
