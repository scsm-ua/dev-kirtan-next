import IndexLink from '@/components/common/IndexLink/IndexLink';
import { getSongbookPagePath, getSongPath, SONGBOOK_PAGE } from '@/other/paths';
import { translate } from '@/other/i18n';
import { TShortcut } from '@/types/book';

/**/
type Props = {
  bookId: string;
  hasAudio: boolean;
  shortcuts: Array<TShortcut>;
};

/** Links shown under the first index link: all audio, then the book's shortcuts. */
function IndexExtraLinks({ bookId, hasAudio, shortcuts }: Props) {
  const count = (hasAudio ? 1 : 0) + shortcuts.length;
  let index = 0;

  return (
    <>
      {hasAudio && (
        <IndexLink
          compact={++index < count}
          href={getSongbookPagePath(bookId, SONGBOOK_PAGE.AUDIO)}
          icon="play"
          title={translate(bookId, 'AUDIO_PAGE.LINK_FULL_TITLE')}
        />
      )}

      {shortcuts.map((shortcut) => (
        <IndexLink
          compact={++index < count}
          href={getSongPath(bookId, shortcut.slug)}
          icon={shortcut.icon}
          key={shortcut.slug}
          title={shortcut.title}
        />
      ))}
    </>
  );
}

/**/
export default IndexExtraLinks;
