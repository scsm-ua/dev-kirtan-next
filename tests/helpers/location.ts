import { vi } from 'vitest';

/**
 * jsdom cannot navigate, and `window.location` cannot be spied on. This puts a
 * stand-in in its place that forwards everything to the real location, except
 * the three methods that load a document. Undo with `vi.unstubAllGlobals()`.
 */
export function mockLocationMethods() {
  const real = window.location;
  const methods = { assign: vi.fn(), reload: vi.fn(), replace: vi.fn() };

  vi.stubGlobal(
    'location',
    new Proxy({} as Location, {
      get: (_target, prop) => {
        if (prop in methods) return methods[prop as keyof typeof methods];
        const value = Reflect.get(real, prop);
        return typeof value === 'function' ? value.bind(real) : value;
      },
      set: (_target, prop, value) => Reflect.set(real, prop, value)
    })
  );

  return methods;
}
