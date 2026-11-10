'use client';

import type { ReactNode } from 'react';

/**/
type Props = {
  children: ReactNode;
  className?: string;
  href: string;
  title?: string;
};

function PlaylistLink({ children, className, href, title }: Props) {
  return (
    <a className={className} href={href} title={title}>
      {children}
    </a>
  );
}

/**/
export default PlaylistLink;
