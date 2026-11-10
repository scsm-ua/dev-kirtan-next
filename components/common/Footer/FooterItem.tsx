'use client';
import { useEffect, useState } from 'react';
import './FooterItem.scss';

/**/
export type TFooterNavItemProps = {
  activeIcon: string;
  fullLabel?: string;
  href: string;
  inactiveIcon: string;
  label: string;
};

/**
 *
 */
function FooterItem({
  activeIcon,
  fullLabel,
  href,
  inactiveIcon,
  label
}: TFooterNavItemProps) {
  const [pathname, setPath] = useState<string | null>(null);

  useEffect(() => {
    setPath(window.location.pathname);
  }, []);

  const hrefPath = href.split('?')[0];
  const isActive = pathname === hrefPath || pathname + '/' === hrefPath;
  const cls = 'FooterItem ' + (isActive ? 'FooterItem--active' : '');

  const iconCls = 'FooterItem__icon ' + (
    isActive ? activeIcon : inactiveIcon
  );

  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      className={cls}
      href={href}
    >
      <div aria-hidden="true" className={iconCls} />
      <span className="FooterItem__label">{label}</span>
      <span className="FooterItem__tooltip">{fullLabel || label}</span>
    </a>
  );
}

/**/
export default FooterItem;
