import { useEffect, useState } from 'react';

/**
 *
 */
export function usePageQuery() {
  const [page, setPage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === void 0) return;
    const params = new URLSearchParams(window.location.search);
    setPage(params.get('p') || '');
  }, []);

  return page;
}
