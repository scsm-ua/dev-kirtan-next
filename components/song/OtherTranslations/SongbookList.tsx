import './SongbookList.scss';
import SongBookItem from '@/components/song/OtherTranslations/SongBookItem';
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
  return (
    <ul className="SongbookList">
      {bookDescriptions.map((description: TBookDescription) => {
        const href = `/${description.slug}/${slug}`;

        return (
          <SongBookItem
            description={description}
            href={href}
            isActive={description.slug === bookId}
            key={description.slug}
          />
        );
      })}
    </ul>
  );
}

/**/
export default SongbookList;
