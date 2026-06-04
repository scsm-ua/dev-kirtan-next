import classNames from 'classnames';

import './VerseText.scss';
import { getLineContent, getLineIndent } from '@/components/song/Verse/helpers';
import type { TSong } from '@/types/song';

/**/
type Props = {
  meta: TSong['meta'];
  hasNumber: boolean; // Whether the verse has number or it's the sole verse in a song.
  text: Array<string>;
};

/**
 *
 */
function VerseText({ hasNumber, meta, text }: Props) {
  return (
    <ul className="VerseText">
      {text.map((line, index) => {
        const content = getLineContent(line, meta, hasNumber);

        if (!content) {
          return (
            <li key={index}>
              <br />
            </li>
          );
        }

        const cls = classNames(
          'VerseText__line',
          'VerseText__indent--' + getLineIndent(line)
        );

        const dsc = { __html: content };
        return <li className={cls} dangerouslySetInnerHTML={dsc} key={index} />;
      })}
    </ul>
  );
}

/**/
export default VerseText;
