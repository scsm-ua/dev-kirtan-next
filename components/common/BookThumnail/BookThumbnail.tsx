'use client';
/* eslint-disable @next/next/no-img-element */
import './BookThumbnail.scss';
import { PATH } from '@/other/constants';

/**/
type Props = { bookId: string };

/**
 *
 */
function BookThumbnail({ bookId }: Props) {
  const src = PATH.IMG.THUMBNAIL + 'thumbnail-' + bookId + '.jpg';

  const srcSet =
    PATH.IMG.THUMBNAIL +
    'thumbnail-' +
    bookId +
    '.jpg 1x,' +
    PATH.IMG.THUMBNAIL +
    'thumbnail-' +
    bookId +
    '@2.jpg 2x';

  return (
    <div className="BookThumbnail">
      <img
        alt=""
        className="BookThumbnail__image"
        srcSet={srcSet}
        src={src}
      />
    </div>
  );
}

/**/
export default BookThumbnail;
