import classNames from 'classnames';

import './LearnVerse.scss';
import {
  buildLearnLines,
  getLineContent,
  getLineIndent
} from '@/components/song/Verse/helpers';
import type { TSong, TVerse } from '@/types/song';

/**/
type Props = {
  meta: TSong['meta'];
  hasNumber: boolean;
  text: Array<string>;
  wordByWord: TVerse['word_by_word'];
};

/**
 * Render verse text with an inline per-word translation row below each word.
 * Word + translation share a column so the wider one defines the column width,
 * keeping next pairs aligned on the y axis.
 */
function LearnVerse({ hasNumber, meta, text, wordByWord }: Props) {
  const parensLight = meta && meta['verse parentheses'] === 'non bold';
  const lineLight =
    meta && meta['inline verse'] === 'non bold' && !hasNumber;

  const lines = buildLearnLines(text, wordByWord);

  return (
    <ul className="LearnVerse">
      {text.map((line, index) => {
        if (!getLineContent(line, meta, hasNumber)) {
          return (
            <li key={index} className="LearnVerse__empty">
              <br />
            </li>
          );
        }

        const cls = classNames(
          'LearnVerse__line',
          'LearnVerse__indent--' + getLineIndent(line)
        );

        return (
          <li className={cls} key={index}>
            {lines[index].map(({ text: groupText, trans, sep }, i) => {
              const wordCls = classNames(
                'LearnVerse__word',
                (lineLight || (parensLight && /[()]/.test(groupText))) &&
                  'LearnVerse__word--light'
              );
              const transCls = classNames(
                'LearnVerse__trans',
                trans === '-' && 'LearnVerse__trans--missing'
              );

              // Convert each whitespace char to NBSP so multi-space indents
              // (e.g. the `    ` gap rendered as Verse__space in VerseText)
              // survive — plain spaces inside a flex item collapse to zero.
              const displaySep = sep.replace(/\s/g, '\u00A0');

              return (
                <span className="LearnVerse__pair" key={i}>
                  <span className={wordCls}>
                    {groupText}
                    {displaySep}
                  </span>
                  <span className={transCls}>{trans}</span>
                </span>
              );
            })}
          </li>
        );
      })}
    </ul>
  );
}

/**/
export default LearnVerse;


