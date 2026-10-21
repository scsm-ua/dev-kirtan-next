'use client';

import './Footer.scss';

import FooterItem from './FooterItem';
import {
  getSongbookPagePath,
  getSongbookPath,
  SONGBOOK_PAGE
} from '@/other/paths';
import { usePageQuery } from '@/other/hooks/usePageQuery';
import { translate } from '@/other/i18n';

import type { TFooterNavItemProps } from './FooterItem';

/**/
type Props = {
  bookId: string;
  page?: string | string[];
};

/**
 *
 */
function getNavItems(bookId: string, page?: string): TFooterNavItemProps[] {
  return [
    {
      activeIcon: 'icon-books-bold',
      href: getSongbookPath(bookId),
      inactiveIcon: 'icon-books',
      label: translate(bookId, 'FOOTER.BOOKS'),
    },
    {
      activeIcon: 'icon-list-music-bold',
      fullLabel: translate(bookId, 'CONTENTS_PAGE.LINK_FULL_TITLE'),
      href: getSongbookPagePath(bookId, SONGBOOK_PAGE.CONTENTS),
      inactiveIcon: 'icon-list-music',
      label: translate(bookId, 'FOOTER.CONTENTS'),
    },
    {
      activeIcon: 'icon-arrow-up-a-z-old',
      fullLabel: translate(bookId, 'A_Z_PAGE.LINK_FULL_TITLE'),
      href: getSongbookPagePath(bookId, SONGBOOK_PAGE.A_Z),
      inactiveIcon: 'icon-arrow-up-a-z',
      label: translate(bookId, 'FOOTER.INDEX'),
    },
    {
      activeIcon: 'icon-search-bold',
      href:
        getSongbookPagePath(bookId, SONGBOOK_PAGE.SEARCH) +
        (page ? `?p=${page}` : ''),
      inactiveIcon: 'icon-search',
      label: translate(bookId, 'FOOTER.SEARCH'),
    }
  ]
}

/**
 *
 */
function getPage(page: string | string[]): string {
  const pageQuery = usePageQuery();
  if (pageQuery) return pageQuery;

  return Array.isArray(page) ? page[0] : page;
}

/**
 *
 */
function Footer({ bookId, page }: Props) {
  const items = getNavItems(bookId, getPage(page));

  return (
    <footer className="Footer">
      <div className="Footer__container">
        <nav aria-label="Songbook navigation" className="Footer__content">
          {items.map((item: TFooterNavItemProps) => (
            <FooterItem key={item.label} {...item} />
          ))}
        </nav>
      </div>
    </footer>
  );
}

/**/
export default Footer;
