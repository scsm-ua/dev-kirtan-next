import { useAppLocation } from '@/other/router/location';

/**
 * `?p=` of the current URL; `null` until hydrated (static HTML has no query).
 */
export function usePageQuery(): string | null {
  const location = useAppLocation();
  return location ? location.search.get('p') || '' : null;
}
