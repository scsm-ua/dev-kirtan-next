import { Fragment } from 'react';
import classNames from 'classnames';

import './LearnVerse.scss';
import {
  getLineContent,
  getLineIndent
} from '@/components/song/Verse/helpers';
import type { TInlineWbwEntry, TSong } from '@/types/song';

// Break a translation around a parenthesised qualifier so it sits on its own
// visual line — both "main (qualifier)" and "(qualifier) main" work.
// Only triggers when the paren contents are ≥4 chars, so short refs like
// `(x)` or `word(y)` stay on one line.
const PAREN_BLOCK = /\([^)]{4,}\)/.source;
function renderTrans(trans: string) {
  const parts = trans.split(
    new RegExp(` (?=${PAREN_BLOCK})|(?<=^${PAREN_BLOCK}) `)
  );
  if (parts.length === 1) return trans;
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {p}
    </Fragment>
  ));
}

/**/
type Props = {
  meta: TSong['meta'];
  hasNumber: boolean;
  lines: TInlineWbwEntry[][];
  text: Array<string>;
};

/**
 * Render verse text with an inline per-word translation row below each word.
 * Word + translation share a column so the wider one defines the column width,
 * keeping next pairs aligned on the y axis.
 */
function LearnVerse({ hasNumber, lines, meta, text }: Props) {
  const parensLight = meta && meta['verse parentheses'] === 'non bold';
  const lineLight =
    meta && meta['inline verse'] === 'non bold' && !hasNumber;

  return (
    <div className="LearnVerse">
      <span className="LearnVerse__gutter" aria-hidden />
      <ul className="LearnVerse__lines">
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
              {lines[index].map(({ text: groupText, trans, sep, error }, i) => {
                const wordCls = classNames(
                  'LearnVerse__word',
                  (lineLight || (parensLight && /[()]/.test(groupText))) &&
                    'LearnVerse__word--light'
                );
                const transCls = classNames(
                  'LearnVerse__trans',
                  trans === '-' && 'LearnVerse__trans--missing',
                  error && `LearnVerse__trans--error-${error}`
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
                    <span className={transCls}>{renderTrans(trans)}</span>
                  </span>
                );
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**/
export default LearnVerse;


