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

  const isActive = pathname === href || pathname === href + '/';
  const cls = 'FooterItem ' + (isActive ? 'FooterItem--active' : '');

  const iconCls = 'FooterItem__icon ' + (
    isActive ? activeIcon : inactiveIcon
  );

  return (
    <a className={cls} href={href}>
      <div className={iconCls} />
      <h6 className="FooterItem__label">{label}</h6>
      <span className="FooterItem__tooltip">{fullLabel || label}</span>
    </a>
  );
}

/**/
export default FooterItem;
