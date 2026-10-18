'use client';

import './PageNumber.scss';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { usePageQuery } from '@/other/hooks/usePageQuery';

/**/
type Props = {
  bookId: string;
  label: string;
  page?: string | string[];
};

/**
 *
 */
function getQuery(pageQuery: string, page?: string | string[]): string {
  if (pageQuery) return `?p=${pageQuery}`;
  if (Array.isArray(page)) return `?p=${page[0]}`;

  return page ? `?p=${page}` : '';
}

/**
 *
 */
function PageNumber({ bookId, label, page }: Props) {
  const pageQuery = usePageQuery();

  if (!page || typeof pageQuery !== 'string') return null;

  const href =
    getSongbookPagePath(bookId, SONGBOOK_PAGE.SEARCH) +
    getQuery(pageQuery, page);
  const text = Array.isArray(page) ? page.join(', ') : page;

  return (
    <div className="PageNumber">
      <a href={href} className="PageNumber__anchor">
        {label}
      </a>{' '}
      <span className="PageNumber__value">{text}</span>
    </div>
  );
}

/**/
export default PageNumber;
