import { Fragment } from 'react';

import './SongbookList.scss';
import SongBookItem from '@/components/song/OtherTranslations/SongBookItem';
import { getSongPath } from '@/other/paths';
import type { TBookDescription } from '@/types/book';

/**/
type Props = {
  bookId: string;
  bookDescriptions: Array<TBookDescription>;
  slug: string;
};

/**
 *
 */
function SongbookList({ bookId, bookDescriptions, slug }: Props) {
  const visible = bookDescriptions.filter((description) => !description.hidden);
  const regular = visible.filter((description) => !description.is_legacy);
  const legacy = visible.filter((description) => description.is_legacy);

  return (
    <ul className="SongbookList">
      {[...regular, ...legacy].map((description: TBookDescription, index) => {
        const href = getSongPath(description.slug, slug);

        return (
          <Fragment key={description.slug}>
            {regular.length > 0 && legacy.length > 0 && index === regular.length && (
              <li aria-hidden="true" className="SongbookList__separator" />
            )}
            <SongBookItem
              description={description}
              href={href}
              isActive={description.slug === bookId}
            />
          </Fragment>
        );
      })}
    </ul>
  );
}

/**/
export default SongbookList;
