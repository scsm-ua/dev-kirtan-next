'use client';

import { useState } from 'react';

import './SongImage.scss';

import type { TImage } from '@/types/resources';

/**/
type Props = {
  alt: string;
  image: TImage;
};

/**
 *
 */
function SongImage({ alt, image }: Props) {
  const [failed, setFailed] = useState<boolean>(false);

  if (failed) return null;

  return (
    <figure className="SongImage">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="SongImage__img"
        style={{ '--song-image-max-width': `${image.width * 2}px` } as React.CSSProperties}
        src={image.src}
        alt={alt}
        title={alt}
        width={image.width}
        height={image.height}
        onError={() => setFailed(true)}
      />
    </figure>
  );
}

/**/
export default SongImage;
