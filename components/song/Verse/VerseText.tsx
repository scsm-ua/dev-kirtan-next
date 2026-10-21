import classNames from 'classnames';
import { Fragment } from 'react';

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
 * Lines are rendered as inline spans joined by <br> inside a single <p> so a
 * copy-paste into a rich editor keeps them as tight consecutive lines (one
 * paragraph) instead of one spaced paragraph per line.
 */
function VerseText({ hasNumber, meta, text }: Props) {
  return (
    <div className="VerseText">
      <span className="VerseText__gutter" aria-hidden />
      <p className="VerseText__lines">
        {text.map((line, index) => {
          const content = getLineContent(line, meta, hasNumber);
          const indent = getLineIndent(line);

          return (
            <Fragment key={index}>
              {index > 0 && <br />}
              {content && (
                <span
                  className={classNames(
                    'VerseText__line',
                    'VerseText__indent--' + indent
                  )}
                >
                  {/* Per-line leading indent, zero-size on screen (the
                      margin-left owns the visible indent) but copied so a
                      paste keeps each line's indentation. */}
                  {indent > 0 && (
                    <span className="VerseText__copyIndent" aria-hidden>
                      {'\u00A0'.repeat(indent * 4)}
                    </span>
                  )}
                  <span dangerouslySetInnerHTML={{ __html: content }} />
                </span>
              )}
            </Fragment>
          );
        })}
      </p>
    </div>
  );
}

/**/
export default VerseText;
