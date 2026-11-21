import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { navigate, setNavigationHandler } from '@/other/router/navigate';
import { mockLocationMethods } from '@/tests/helpers/location';

const ORIGIN = window.location.origin;

describe('navigate', () => {
  let location: ReturnType<typeof mockLocationMethods>;
  const handler = vi.fn();

  beforeEach(() => {
    location = mockLocationMethods();
    handler.mockClear();
    setNavigationHandler(handler);
  });

  afterEach(() => {
    setNavigationHandler(null);
    vi.unstubAllGlobals();
  });

  it('hands an app page to the app router', () => {
    navigate('/en/contents/?p=2#top');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].href).toBe(`${ORIGIN}/en/contents/?p=2#top`);
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('passes the options on', () => {
    navigate('/en/contents/', { replace: true });

    expect(handler.mock.calls[0][1]).toEqual({ replace: true });
  });

  it.each([
    ['a page outside the app', '/en/export/', `${ORIGIN}/en/export/`],
    ['another site', 'https://example.com/en/contents/', 'https://example.com/en/contents/']
  ])('loads %s as a document', (_name, href, expected) => {
    navigate(href);

    expect(handler).not.toHaveBeenCalled();
    expect(location.assign).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('replaces the document when asked to', () => {
    navigate('/en/export/', { replace: true });

    expect(location.replace).toHaveBeenCalledExactlyOnceWith(`${ORIGIN}/en/export/`);
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('loads an app page as a document when no app is mounted', () => {
    setNavigationHandler(null);

    navigate('/en/contents/');

    expect(location.assign).toHaveBeenCalledExactlyOnceWith(`${ORIGIN}/en/contents/`);
  });
});
