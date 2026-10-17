'use client';

import './Footer.scss';

import FooterItem from './FooterItem';
import { PATH } from '@/other/constants';
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
      href: '/' + bookId + PATH.PAGE.BOOK_LIST,
      inactiveIcon: 'icon-books',
      label: translate(bookId, 'FOOTER.BOOKS'),
    },
    {
      activeIcon: 'icon-list-music-bold',
      fullLabel: translate(bookId, 'CONTENTS_PAGE.LINK_FULL_TITLE'),
      href: '/' + bookId + PATH.PAGE.CONTENTS,
      inactiveIcon: 'icon-list-music',
      label: translate(bookId, 'FOOTER.CONTENTS'),
    },
    {
      activeIcon: 'icon-arrow-up-a-z-old',
      fullLabel: translate(bookId, 'A_Z_PAGE.LINK_FULL_TITLE'),
      href: '/' + bookId + PATH.PAGE.A_Z,
      inactiveIcon: 'icon-arrow-up-a-z',
      label: translate(bookId, 'FOOTER.INDEX'),
    },
    {
      activeIcon: 'icon-search-bold',
      href: '/' + bookId + PATH.PAGE.SEARCH + (page ? `?p=${page}` : ''),
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
        <div className="Footer__content">
          {items.map((item: TFooterNavItemProps) => (
            <FooterItem key={item.label} {...item} />
          ))}
        </div>
      </div>
    </footer>
  );
}

/**/
export default Footer;
