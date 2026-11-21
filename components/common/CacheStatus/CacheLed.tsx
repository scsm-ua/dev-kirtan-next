import './CacheLed.scss';

import type { TBookCacheState } from '@/other/hooks/useCacheStatus';

/**/
type Props = {
  /** Read by screen readers; without it the dot is decoration. */
  label?: string;
  state: TBookCacheState;
};

/**
 * Dot that shows whether a songbook is available offline: green when cached,
 * yellow otherwise (pulsing while caching). Nothing without a service worker.
 * `data-status` is also what the e2e tests wait for.
 */
function CacheLed({ label, state }: Props) {
  if (state === 'unavailable') return null;

  return label
    ? <span aria-label={label} className="CacheLed" data-status={state} role="img" />
    : <span aria-hidden="true" className="CacheLed" data-status={state} />;
}

/**/
export default CacheLed;
