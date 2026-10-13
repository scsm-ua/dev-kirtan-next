import classNames from 'classnames';

import './VerseTranslation.scss';
import { processTranslationLines } from '@/other/utils';

/**/
type Props = {
  isWide: boolean;
  isWBW: boolean;
  translation: string[];
};

/**
 *
 */
function VerseTranslation({ isWide, isWBW, translation }: Props) {
  const cls = classNames(
    'VerseTranslation__paragraph',
    isWide && 'VerseTranslation__paragraph--wide',
    isWBW && 'VerseTranslation__paragraph--dark'
  );

  return (
    <ul className="VerseTranslation">
      {processTranslationLines(translation, 'VerseTranslation').map((item) => (
        <li key={item}>
          <p className={cls} dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ul>
  );
}

/**/
export default VerseTranslation;
