import { act, render } from '@testing-library/react';
import { vi } from 'vitest';

import AppRoot from '@/components/app/AppRoot';
import { notifyLocationChange } from '@/other/router/location';
import { getRoutePath } from '@/other/router/routes';

import type { ReactNode } from 'react';
import type { TPageData } from '@/types/pageData';

/**
 * Rendering for component tests: the address bar and the browser parts that
 * jsdom lacks, so a component sees what it sees in a browser.
 */

/**
 * Stand-ins for layout APIs jsdom does not have. Call in `beforeEach`;
 * undo with `vi.unstubAllGlobals()`.
 */
export function stubBrowserApis(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {}
  }));
  Element.prototype.scrollIntoView = vi.fn();
}

/** Puts a path in the address bar and tells the mounted components, as a navigation does. */
export function openPath(path: string): void {
  act(() => {
    window.history.replaceState(null, '', path);
    notifyLocationChange();
  });
}

/** The whole client app on the page's own URL (`search` adds a query, e.g. `?p=12`). */
export function renderApp(page: TPageData | null, { extras, search = '' }: { extras?: ReactNode; search?: string } = {}) {
  if (page) window.history.replaceState(null, '', getRoutePath(page.route) + search);
  return render(<AppRoot extras={extras} initial={page} />);
}

/** Problems React reports while rendering (duplicate keys, invalid nesting, …). */
export function collectReactErrors(): { errors: string[]; restore: () => void } {
  const errors: string[] = [];
  const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' ').slice(0, 300));
  });

  return { errors, restore: () => spy.mockRestore() };
}
