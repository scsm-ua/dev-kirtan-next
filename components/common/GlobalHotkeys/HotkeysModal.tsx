import AppModal from '@/components/common/Modal/AppModal';
import { translate } from '@/other/i18n';
import './HotkeysModal.scss';

/**/
type Props = {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
};

/**
 *
 */
function HotkeysModal({ bookId, isOpen, onClose }: Props) {
  const t = (key: string) => translate(bookId, key);

  type THotkeyRow = {
    keys: string[];
    desc: string;
  };

  const HOTKEYS: THotkeyRow[] = [
    { keys: ['h'], desc: 'Show / hide this help' }, // TODO: add HOTKEYS.HELP to translations.json
    { keys: ['b'], desc: t('FOOTER.BOOKS') },
    { keys: ['c'], desc: t('FOOTER.CONTENTS') },
    { keys: ['i'], desc: t('FOOTER.INDEX') },
    { keys: ['s'], desc: t('FOOTER.SEARCH') },
    { keys: ['e'], desc: 'Export songbook as HTML' }, // TODO: add HOTKEYS.EXPORT to translations.json
    { keys: ['l'], desc: `${t('SONG_PAGE.OTHER_TRANSLATIONS')} / ${t('FOOTER.BOOKS')}` },
    { keys: ['←'], desc: t('SONG_PAGE.PREVIOUS_SONG') },
    { keys: ['→'], desc: t('SONG_PAGE.NEXT_SONG') },
    { keys: ['1', '2', '3'], desc: t('SONG_PAGE.SHOW_TRANSLATION') },
    { keys: ['4', '5', '6'], desc: 'Word-by-word: hide / inline / classical' }, // TODO: add HOTKEYS.WORD_BY_WORD to translations.json
  ];

  return (
    <AppModal header="Keyboard shortcuts" isOpen={isOpen} onClose={onClose}>
      <dl className="HotkeysModal">
        {HOTKEYS.map(({ keys, desc }) => (
          <div className="HotkeysModal__row" key={keys.join('|')}>
            <dt className="HotkeysModal__key">
              {keys.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </dt>
            <dd className="HotkeysModal__desc">{desc}</dd>
          </div>
        ))}
      </dl>
    </AppModal>
  );
}

/**/
export default HotkeysModal;
